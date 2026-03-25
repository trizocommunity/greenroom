"use server";

import { randomBytes, createHash } from "node:crypto";
import type { Tier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { APP_URL } from "@/config/routes";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { calculateGrade, calculatePosition } from "@/lib/results-calculator";
import { updateProgrammeStatus } from "@/server/services/programme-status.service";
import type { ActionResponse } from "@/types/actions";

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hashTokenSHA256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateJudgeToken(): string {
  return base64UrlEncode(randomBytes(32));
}

function parseJudgePoints(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function validateJudgePoints(n: number, min = 0, max = 10, step = 0.5) {
  // Step check: points must be multiples of `step` (0.5).
  const scaled = n / step;
  const isStepMultiple = Math.abs(scaled - Math.round(scaled)) < 1e-9;
  if (!Number.isFinite(n) || !isStepMultiple) return false;
  if (n < min || n > max) return false;
  return true;
}

async function assertStageManagerAccess(festivalId: string): Promise<{
  actorName: string;
  festival: { id: string; slug: string; tier: Tier; ownerId: string };
}> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { id: true, slug: true, tier: true, ownerId: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  const canUseJudging = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canUseJudging) {
    throw new AppError("External judging is available on Standard plan and above.");
  }

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true, fullName: true, email: true },
    });
    return {
      actorName: user?.displayName || user?.fullName || user?.email || "Stage Manager",
      festival,
    };
  }

  const member = await prisma.festivalMember.findUnique({
    where: { festivalId_userId: { festivalId, userId: session.userId } },
    select: {
      role: true,
      isActive: true,
      user: { select: { displayName: true, fullName: true, email: true } },
    },
  });

  if (!member?.isActive || (member.role !== "STAGE_MANAGER" && member.role !== "ADMIN")) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return {
    actorName:
      member.user.displayName || member.user.fullName || member.user.email || "Stage Manager",
    festival,
  };
}

type CreateJudgeLinkResponse = {
  judgeUrl: string;
  startedAt: Date;
};

export async function createProgrammeJudgeLinkAction(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<CreateJudgeLinkResponse>> {
  try {
    const { actorName, festival } = await assertStageManagerAccess(festivalId);

    const programme = await prisma.programme.findUnique({
      where: { id: programmeId },
      select: { id: true, festivalId: true, status: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    if (programme.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);
    }
    if (programme.status !== "STARTED") {
      throw new AppError("Programme must be in STARTED state to create a judge link.");
    }

    const latestClosedReportingSession = await prisma.programmeReportingSession.findFirst({
      where: { programmeId, status: "CLOSED" },
      orderBy: { endedAt: "desc" },
      select: { id: true },
    });
    if (!latestClosedReportingSession) {
      throw new AppError("No closed reporting session found for this programme.");
    }

    const codeLettersCount = await prisma.programmeCodeLetter.count({
      where: { programmeId, reportingSessionId: latestClosedReportingSession.id },
    });
    if (codeLettersCount === 0) {
      throw new AppError("No code letters found for this programme.");
    }

    const now = new Date();
    let rawToken = "";
    let judgeSessionId = "";

    await prisma.$transaction(async (tx) => {
      // Ensure there is only one OPEN token at a time for this programme.
      await tx.programmeJudgeSession.updateMany({
        where: { programmeId, usedAt: null },
        data: { usedAt: now, endedAt: now },
      });

      rawToken = generateJudgeToken();
      const tokenHash = hashTokenSHA256(rawToken);

      const created = await tx.programmeJudgeSession.create({
        data: {
          festivalId,
          programmeId,
          reportingSessionId: latestClosedReportingSession.id,
          tokenHash,
          startedAt: now,
          createdBy: actorName,
        },
        select: { id: true },
      });
      judgeSessionId = created.id;
    });

    // `judgeSessionId` exists to ensure the transaction ran; the only secret is the raw token.
    if (!rawToken || !judgeSessionId) {
      throw new AppError("Failed to create judge link.");
    }

    const base = APP_URL.replace(/\/$/, "");
    const judgeUrl = `${base}/${festival.slug}/judge/${rawToken}`;

    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: { judgeUrl, startedAt: now } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitProgrammeJudgeSessionAction(
  token: string,
  pointsByCode: Record<string, unknown>,
): Promise<ActionResponse<void>> {
  try {
    if (!token || typeof token !== "string") {
      throw new AppError(ERROR_MESSAGES.VALIDATION);
    }
    if (!pointsByCode || typeof pointsByCode !== "object") {
      throw new AppError(ERROR_MESSAGES.VALIDATION);
    }

    const tokenHash = hashTokenSHA256(token);
    const judgeSession = await prisma.programmeJudgeSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        festivalId: true,
        programmeId: true,
        reportingSessionId: true,
        usedAt: true,
      },
    });

    if (!judgeSession || judgeSession.usedAt) {
      throw new AppError("Judging closed.");
    }

    const programme = await prisma.programme.findUnique({
      where: { id: judgeSession.programmeId },
      select: { id: true, status: true, festivalId: true, type: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    if (programme.festivalId !== judgeSession.festivalId) {
      throw new AppError("Judging closed.");
    }
    if (programme.status !== "STARTED") {
      // If programme already moved forward, treat judge link as closed.
      throw new AppError("Judging closed.");
    }

    const festival = await prisma.festival.findUnique({
      where: { id: judgeSession.festivalId },
      select: { tier: true, slug: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

    const canUseJudging = await getEffectiveFeatureEnabled(festival.tier, "schedule");
    if (!canUseJudging) throw new AppError("Judging closed.");

    const codeLetters = await prisma.programmeCodeLetter.findMany({
      where: {
        programmeId: judgeSession.programmeId,
        reportingSessionId: judgeSession.reportingSessionId,
      },
      orderBy: { issuedAt: "asc" },
      select: {
        id: true,
        code: true,
        recipients: { select: { studentId: true } },
      },
    });

    if (codeLetters.length === 0) {
      throw new AppError("Judging closed.");
    }

    const pointsByCodeResolved = new Map<string, number>();
    for (const cl of codeLetters) {
      const raw = (pointsByCode as Record<string, unknown>)[cl.code];
      const n = parseJudgePoints(raw);
      if (n == null) {
        throw new AppError(`Missing/invalid points for code '${cl.code}'.`);
      }
      if (!validateJudgePoints(n)) {
        throw new AppError(`Points out of allowed range for code '${cl.code}'.`);
      }
      pointsByCodeResolved.set(cl.code, n);
    }

    const pointsArray = codeLetters.map((cl) => pointsByCodeResolved.get(cl.code)!);
    const maxPoints = pointsArray.length > 0 ? Math.max(...pointsArray) : 10;

    const gradeByCode = new Map<string, { grade: string; remarks: string }>();
    const positionByCode = new Map<string, number>();

    for (const cl of codeLetters) {
      const pts = pointsByCodeResolved.get(cl.code)!;
      const gradeData = calculateGrade(pts, maxPoints);
      gradeByCode.set(cl.code, { grade: gradeData.grade, remarks: gradeData.remarks });
      positionByCode.set(cl.code, calculatePosition(pts, pointsArray));
    }

    // Map each code letter -> all ProgrammeAssignment IDs for its recipients.
    const allStudentIds = Array.from(
      new Set(codeLetters.flatMap((cl) => cl.recipients.map((r) => r.studentId))),
    );
    if (allStudentIds.length === 0) throw new AppError("Judging closed.");

    const assignments = await prisma.programmeAssignment.findMany({
      where: { programmeId: judgeSession.programmeId, studentId: { in: allStudentIds } },
      select: { id: true, studentId: true },
    });
    const assignmentByStudentId = new Map(assignments.map((a) => [a.studentId, a.id]));

    for (const sid of allStudentIds) {
      if (!assignmentByStudentId.get(sid)) {
        throw new AppError("Judging closed.");
      }
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Single-use enforcement for this exact token.
      const usedUpdate = await tx.programmeJudgeSession.updateMany({
        where: { tokenHash, usedAt: null },
        data: { usedAt: now, endedAt: now },
      });
      if (usedUpdate.count !== 1) {
        throw new AppError("Judging closed.");
      }

      // Close any other OPEN tokens for this programme (prevents multiple submissions).
      await tx.programmeJudgeSession.updateMany({
        where: { programmeId: judgeSession.programmeId, usedAt: null },
        data: { usedAt: now, endedAt: now },
      });

      for (const cl of codeLetters) {
        const pts = pointsByCodeResolved.get(cl.code)!;
        const roundedPoints = Math.round(pts);
        const { grade, remarks } = gradeByCode.get(cl.code)!;
        const position = positionByCode.get(cl.code)!;

        const assignmentIds = cl.recipients
          .map((r) => assignmentByStudentId.get(r.studentId))
          .filter((id): id is string => Boolean(id));

        if (assignmentIds.length === 0) {
          // No recipients -> cannot write results -> keep this token unusable.
          throw new AppError("Judging closed.");
        }

        for (const assignmentId of assignmentIds) {
          await tx.result.upsert({
            where: { assignmentId },
            create: {
              festivalId: judgeSession.festivalId,
              programmeId: judgeSession.programmeId,
              assignmentId,
              grade,
              position,
              points: roundedPoints,
              remarks,
              isPublished: false,
            },
            update: {
              grade,
              position,
              points: roundedPoints,
              remarks,
              isPublished: false,
            },
          });
        }
      }
    });

    await updateProgrammeStatus(judgeSession.programmeId, judgeSession.reportingSessionId);
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

