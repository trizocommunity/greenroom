"use server";

import { createHash, randomBytes } from "node:crypto";
import type { Tier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { APP_URL } from "@/config/routes";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { calculateGrade, calculatePosition } from "@/lib/results-calculator";
import { emitDomainRealtimeEvent } from "@/server/realtime/domain-events";
import { RealtimeRoom } from "@/server/realtime/rooms";
import { getEffectiveFeatureTagEnabled } from "@/server/services/plan-features-tags.service";
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

function hashValueSHA256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateJudgeToken(): string {
  return base64UrlEncode(randomBytes(32));
}

function generateOpenNonce(): string {
  return base64UrlEncode(randomBytes(24));
}

const OPEN_LOCK_TTL_MS = 30_000;

function parseJudgePoints(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function validateJudgePoints(n: number, min = 0, max = 10, step = 1) {
  // Result points are stored as Int, so values must be whole numbers.
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

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    festival.tier,
    "eventWorks.externalJudging",
  );
  if (!canUseJudging) {
    throw new AppError(
      "External judging is available on Standard plan and above.",
    );
  }

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true, fullName: true, email: true },
    });
    return {
      actorName:
        user?.displayName || user?.fullName || user?.email || "Stage Manager",
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

  if (
    !member?.isActive ||
    (member.role !== "STAGE_MANAGER" && member.role !== "ADMIN")
  ) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return {
    actorName:
      member.user.displayName ||
      member.user.fullName ||
      member.user.email ||
      "Stage Manager",
    festival,
  };
}

type CreateJudgeLinkResponse = {
  judgeUrl: string;
  startedAt: Date;
};

export type JudgeIdentityInput = {
  judgeName: string;
  judgeContact?: string | null;
  judgeNote?: string | null;
};

export type JudgeOpenContextResponse = {
  openNonce: string;
  openExpiresAt: Date;
};

function normalizeJudgeIdentity(input: JudgeIdentityInput) {
  const judgeName = (input.judgeName ?? "").trim();
  const judgeContact = (input.judgeContact ?? "").trim();
  const judgeNote = (input.judgeNote ?? "").trim();

  if (judgeName.length < 2 || judgeName.length > 120) {
    throw new AppError("Please enter a valid judge name.");
  }
  if (judgeContact.length > 160) {
    throw new AppError("Judge contact is too long.");
  }
  if (judgeNote.length > 500) {
    throw new AppError("Judge note is too long.");
  }

  return {
    judgeName,
    judgeContact: judgeContact || null,
    judgeNote: judgeNote || null,
  };
}

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
      throw new AppError(
        "Programme must be in STARTED state to create a judge link.",
      );
    }

    const canUseJudging = await getEffectiveFeatureTagEnabled(
      festival.tier,
      "eventWorks.externalJudging",
    );
    if (!canUseJudging) {
      throw new AppError("External judging is not available on this tier.");
    }

    const latestClosedReportingSession =
      await prisma.programmeReportingSession.findFirst({
        where: { programmeId, status: "CLOSED" },
        orderBy: { endedAt: "desc" },
        select: { id: true },
      });
    if (!latestClosedReportingSession) {
      throw new AppError(
        "No closed reporting session found for this programme.",
      );
    }

    const codeLettersCount = await prisma.programmeCodeLetter.count({
      where: {
        programmeId,
        reportingSessionId: latestClosedReportingSession.id,
      },
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
        where: { programme_id: programmeId, used_at: null },
        data: {
          used_at: now,
          ended_at: now,
          open_nonce_hash: null,
          opened_at: null,
          open_expires_at: null,
          open_client_fingerprint_hash: null,
        },
      });

      rawToken = generateJudgeToken();
      const tokenHash = hashTokenSHA256(rawToken);

      const created = await tx.programmeJudgeSession.create({
        data: {
          festival_id: festivalId,
          programme_id: programmeId,
          reporting_session_id: latestClosedReportingSession.id,
          token_hash: tokenHash,
          started_at: now,
          created_by: actorName,
          updated_at: now,
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
    await emitDomainRealtimeEvent({
      eventName: "judgment.link_created",
      festivalId,
      entityType: "programme",
      entityId: programmeId,
      roomKeys: [
        RealtimeRoom.festivalAll(festivalId),
        RealtimeRoom.judgementProgramme(festivalId, programmeId),
      ],
      payload: {
        programmeId,
        judgeSessionId,
      },
    });

    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: { judgeUrl, startedAt: now } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function regenerateProgrammeJudgeLinkAction(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<CreateJudgeLinkResponse>> {
  return createProgrammeJudgeLinkAction(festivalId, programmeId);
}

export async function acquireJudgeOpenLockAction(
  token: string,
  openClientFingerprint?: string | null,
): Promise<ActionResponse<JudgeOpenContextResponse>> {
  try {
    if (!token || typeof token !== "string") {
      throw new AppError("Judging closed.");
    }

    const tokenHash = hashTokenSHA256(token);
    const now = new Date();

    const session = await prisma.programmeJudgeSession.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        festival_id: true,
        used_at: true,
        open_expires_at: true,
        open_nonce_hash: true,
      },
    });
    if (!session || session.used_at) throw new AppError("Judging closed.");

    const festival = await prisma.festival.findUnique({
      where: { id: session.festival_id },
      select: { tier: true },
    });
    if (!festival) throw new AppError("Judging closed.");
    const canUseJudging = await getEffectiveFeatureTagEnabled(
      festival.tier,
      "eventWorks.externalJudging",
    );
    if (!canUseJudging) throw new AppError("Judging closed.");

    const existingLockActive =
      session.open_nonce_hash &&
      session.open_expires_at &&
      session.open_expires_at.getTime() > now.getTime();
    if (existingLockActive) {
      // Security hard-stop: if this token is opened again (refresh/new tab/device)
      // while an active lock exists, permanently expire this token.
      await prisma.programmeJudgeSession.updateMany({
        where: {
          token_hash: tokenHash,
          used_at: null,
          open_nonce_hash: { not: null },
          open_expires_at: { gt: now },
        },
        data: {
          used_at: now,
          ended_at: now,
          open_nonce_hash: null,
          opened_at: null,
          open_expires_at: null,
          open_client_fingerprint_hash: null,
        },
      });
      throw new AppError(
        "This judging link expired after being reopened. Ask stage manager to regenerate a new link.",
      );
    }

    const openNonce = generateOpenNonce();
    const openNonceHash = hashValueSHA256(openNonce);
    const openExpiresAt = new Date(now.getTime() + OPEN_LOCK_TTL_MS);
    const openClientFingerprintHash = openClientFingerprint?.trim()
      ? hashValueSHA256(openClientFingerprint.trim())
      : null;

    const locked = await prisma.programmeJudgeSession.updateMany({
      where: {
        token_hash: tokenHash,
        used_at: null,
        OR: [
          { open_nonce_hash: null },
          { open_expires_at: null },
          { open_expires_at: { lte: now } },
        ],
      },
      data: {
        opened_at: now,
        open_expires_at: openExpiresAt,
        open_nonce_hash: openNonceHash,
        open_client_fingerprint_hash: openClientFingerprintHash,
      },
    });

    if (locked.count !== 1) {
      throw new AppError("Link expired or already in use.");
    }

    return { success: true, data: { openNonce, openExpiresAt } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function refreshJudgeOpenLockAction(
  token: string,
  openNonce: string,
): Promise<ActionResponse<{ openExpiresAt: Date }>> {
  try {
    if (!token || !openNonce) {
      throw new AppError("Judging closed.");
    }
    const now = new Date();
    const tokenHash = hashTokenSHA256(token);
    const openNonceHash = hashValueSHA256(openNonce);
    const openExpiresAt = new Date(now.getTime() + OPEN_LOCK_TTL_MS);

    const refreshed = await prisma.programmeJudgeSession.updateMany({
      where: {
        token_hash: tokenHash,
        used_at: null,
        open_nonce_hash: openNonceHash,
        open_expires_at: { gt: now },
      },
      data: { open_expires_at: openExpiresAt },
    });
    if (refreshed.count !== 1) {
      throw new AppError("Link expired or already in use.");
    }
    return { success: true, data: { openExpiresAt } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitProgrammeJudgeSessionAction(
  token: string,
  pointsByCode: Record<string, unknown>,
  judgeInfo: JudgeIdentityInput,
  openNonce: string,
): Promise<ActionResponse<void>> {
  try {
    if (!token || typeof token !== "string") {
      throw new AppError(ERROR_MESSAGES.VALIDATION);
    }
    if (!pointsByCode || typeof pointsByCode !== "object") {
      throw new AppError(ERROR_MESSAGES.VALIDATION);
    }
    if (!openNonce || typeof openNonce !== "string") {
      throw new AppError("Judging closed.");
    }
    const normalizedJudge = normalizeJudgeIdentity(judgeInfo);

    const tokenHash = hashTokenSHA256(token);
    const judgeSession = await prisma.programmeJudgeSession.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        festival_id: true,
        programme_id: true,
        reporting_session_id: true,
        used_at: true,
        open_nonce_hash: true,
        open_expires_at: true,
      },
    });

    if (!judgeSession || judgeSession.used_at) {
      throw new AppError("Judging closed.");
    }
    const now = new Date();
    const providedOpenNonceHash = hashValueSHA256(openNonce);
    if (
      !judgeSession.open_nonce_hash ||
      judgeSession.open_nonce_hash !== providedOpenNonceHash ||
      !judgeSession.open_expires_at ||
      judgeSession.open_expires_at.getTime() <= now.getTime()
    ) {
      throw new AppError("Link expired or already in use.");
    }

    const programme = await prisma.programme.findUnique({
      where: { id: judgeSession.programme_id },
      select: { id: true, status: true, festivalId: true, type: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    if (programme.festivalId !== judgeSession.festival_id) {
      throw new AppError("Judging closed.");
    }
    if (programme.status !== "STARTED") {
      // If programme already moved forward, treat judge link as closed.
      throw new AppError("Judging closed.");
    }

    const festival = await prisma.festival.findUnique({
      where: { id: judgeSession.festival_id },
      select: { tier: true, slug: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

    const canUseJudging = await getEffectiveFeatureTagEnabled(
      festival.tier,
      "eventWorks.externalJudging",
    );
    if (!canUseJudging) throw new AppError("Judging closed.");

    const codeLetters = await prisma.programmeCodeLetter.findMany({
      where: {
        programmeId: judgeSession.programme_id,
        reportingSessionId: judgeSession.reporting_session_id,
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
        throw new AppError(
          `Points out of allowed range for code '${cl.code}'.`,
        );
      }
      pointsByCodeResolved.set(cl.code, n);
    }

    const pointsArray = codeLetters.map(
      (cl) => pointsByCodeResolved.get(cl.code)!,
    );
    const maxPoints = pointsArray.length > 0 ? Math.max(...pointsArray) : 10;

    const gradeByCode = new Map<string, { grade: string; remarks: string }>();
    const positionByCode = new Map<string, number>();

    for (const cl of codeLetters) {
      const pts = pointsByCodeResolved.get(cl.code)!;
      const gradeData = calculateGrade(pts, maxPoints);
      gradeByCode.set(cl.code, {
        grade: gradeData.grade,
        remarks: gradeData.remarks,
      });
      positionByCode.set(cl.code, calculatePosition(pts, pointsArray));
    }

    // Map each code letter -> all ProgrammeAssignment IDs for its recipients.
    const allStudentIds = Array.from(
      new Set(
        codeLetters.flatMap((cl) => cl.recipients.map((r) => r.studentId)),
      ),
    );
    if (allStudentIds.length === 0) throw new AppError("Judging closed.");

    const assignments = await prisma.programmeAssignment.findMany({
      where: {
        programmeId: judgeSession.programme_id,
        studentId: { in: allStudentIds },
      },
      select: { id: true, studentId: true },
    });
    const assignmentByStudentId = new Map(
      assignments.map((a) => [a.studentId, a.id]),
    );

    for (const sid of allStudentIds) {
      if (!assignmentByStudentId.get(sid)) {
        throw new AppError("Judging closed.");
      }
    }

    await prisma.$transaction(async (tx) => {
      // Single-use enforcement for this exact token.
      const usedUpdate = await tx.programmeJudgeSession.updateMany({
        where: {
          token_hash: tokenHash,
          used_at: null,
          open_nonce_hash: providedOpenNonceHash,
          open_expires_at: { gt: now },
        },
        data: {
          used_at: now,
          ended_at: now,
          submitted_by_name: normalizedJudge.judgeName,
          submitted_by_contact: normalizedJudge.judgeContact,
          submitted_by_note: normalizedJudge.judgeNote,
          open_nonce_hash: null,
          opened_at: null,
          open_expires_at: null,
          open_client_fingerprint_hash: null,
        },
      });
      if (usedUpdate.count !== 1) {
        throw new AppError("Link expired or already in use.");
      }

      // Close any other OPEN tokens for this programme (prevents multiple submissions).
      await tx.programmeJudgeSession.updateMany({
        where: { programme_id: judgeSession.programme_id, used_at: null },
        data: {
          used_at: now,
          ended_at: now,
          open_nonce_hash: null,
          opened_at: null,
          open_expires_at: null,
          open_client_fingerprint_hash: null,
        },
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
              festivalId: judgeSession.festival_id,
              programmeId: judgeSession.programme_id,
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

    await updateProgrammeStatus(
      judgeSession.programme_id,
      judgeSession.reporting_session_id,
    );
    await emitDomainRealtimeEvent({
      eventName: "judgment.submitted",
      festivalId: judgeSession.festival_id,
      entityType: "programme",
      entityId: judgeSession.programme_id,
      roomKeys: [
        RealtimeRoom.festivalAll(judgeSession.festival_id),
        RealtimeRoom.judgementProgramme(
          judgeSession.festival_id,
          judgeSession.programme_id,
        ),
      ],
      payload: {
        programmeId: judgeSession.programme_id,
        reportingSessionId: judgeSession.reporting_session_id,
      },
    });
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
