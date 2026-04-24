"use server";

import { createHash, randomBytes } from "node:crypto";
import { randomUUID } from "crypto";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { APP_URL } from "@/config/routes";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeCodeLetter as codeLetterTable,
  festival as festivalTable,
  festivalMember as memberTable,
  programmeJudgeSession as pjsTable,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
  user as userTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import {
  calculateGrade,
  calculatePosition,
} from "@/features/results/services/results-calculator";

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
  const scaled = n / step;
  const isStepMultiple = Math.abs(scaled - Math.round(scaled)) < 1e-9;
  if (!Number.isFinite(n) || !isStepMultiple) return false;
  if (n < min || n > max) return false;
  return true;
}

async function assertStageManagerAccess(festivalId: string): Promise<{
  actorName: string;
  festival: {
    id: string;
    slug: string;
    tier: "BASIC" | "STANDARD" | "PRO";
    ownerId: string;
  };
}> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { id: true, slug: true, tier: true, ownerId: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  const tier = (festival.tier || "BASIC") as "BASIC" | "STANDARD" | "PRO";
  const canUseJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );
  if (!canUseJudging) {
    throw new AppError(
      "External judging is available on Standard plan and above.",
    );
  }

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, session.userId),
      columns: { displayName: true, fullName: true, email: true },
    });
    return {
      actorName:
        user?.displayName || user?.fullName || user?.email || "Stage Manager",
      festival: { ...festival, tier },
    };
  }

  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(memberTable.festivalId, festivalId),
      eq(memberTable.userId, session.userId),
    ),
    with: {
      user: { columns: { displayName: true, fullName: true, email: true } },
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
    festival: { ...festival, tier },
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

    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: { id: true, festivalId: true, status: true },
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

    const latestClosedReportingSession =
      await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(reportingSessionTable.programmeId, programmeId),
          eq(reportingSessionTable.status, "CLOSED"),
        ),
        orderBy: [desc(reportingSessionTable.endedAt)],
        columns: { id: true },
      });
    if (!latestClosedReportingSession) {
      throw new AppError(
        "No closed reporting session found for this programme.",
      );
    }

    const [codeLettersResult] = await db
      .select({ c: count() })
      .from(codeLetterTable)
      .where(
        and(
          eq(codeLetterTable.programmeId, programmeId),
          eq(
            codeLetterTable.reportingSessionId,
            latestClosedReportingSession.id,
          ),
        ),
      );

    if (codeLettersResult.c === 0) {
      throw new AppError("No code letters found for this programme.");
    }

    const now = new Date().toISOString();
    let rawToken = "";
    let judgeSessionId = "";

    await db.transaction(async (tx) => {
      // Ensure there is only one OPEN token at a time for this programme.
      await tx
        .update(pjsTable)
        .set({
          usedAt: now,
          endedAt: now,
          openNonceHash: null,
          openedAt: null,
          openExpiresAt: null,
          openClientFingerprintHash: null,
          updatedAt: now,
        })
        .where(
          and(eq(pjsTable.programmeId, programmeId), isNull(pjsTable.usedAt)),
        );

      rawToken = generateJudgeToken();
      const tokenHash = hashTokenSHA256(rawToken);

      judgeSessionId = randomUUID();
      await tx.insert(pjsTable).values({
        id: judgeSessionId,
        festivalId: festivalId,
        programmeId: programmeId,
        reportingSessionId: latestClosedReportingSession.id,
        tokenHash: tokenHash,
        startedAt: now,
        createdBy: actorName,
        updatedAt: now,
      });
    });

    if (!rawToken || !judgeSessionId) {
      throw new AppError("Failed to create judge link.");
    }

    const base = APP_URL.replace(/\/$/, "");
    const judgeUrl = `${base}/${festival.slug}/judge/${rawToken}`;

    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: { judgeUrl, startedAt: new Date(now) } };
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

    const session = await db.query.programmeJudgeSession.findFirst({
      where: eq(pjsTable.tokenHash, tokenHash),
      columns: {
        id: true,
        festivalId: true,
        usedAt: true,
        openExpiresAt: true,
        openNonceHash: true,
      },
    });
    if (!session || session.usedAt) throw new AppError("Judging closed.");

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, session.festivalId),
      columns: { tier: true },
    });
    if (!festival) throw new AppError("Judging closed.");

    const tier = (festival.tier || "BASIC") as "BASIC" | "STANDARD" | "PRO";
    const canUseJudging = await getEffectiveFeatureTagEnabled(
      tier,
      "eventWorks.externalJudging",
    );
    if (!canUseJudging) throw new AppError("Judging closed.");

    const existingLockActive =
      session.openNonceHash &&
      session.openExpiresAt &&
      new Date(session.openExpiresAt).getTime() > now.getTime();

    if (existingLockActive) {
      await db
        .update(pjsTable)
        .set({
          usedAt: now.toISOString(),
          endedAt: now.toISOString(),
          openNonceHash: null,
          openedAt: null,
          openExpiresAt: null,
          openClientFingerprintHash: null,
          updatedAt: now.toISOString(),
        })
        .where(
          and(
            eq(pjsTable.tokenHash, tokenHash),
            isNull(pjsTable.usedAt),
            ne(pjsTable.openNonceHash, sql`NULL`), // I'll just use a safe where
            gt(pjsTable.openExpiresAt, now.toISOString()),
          ),
        );
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

    const locked = await db
      .update(pjsTable)
      .set({
        openedAt: now.toISOString(),
        openExpiresAt: openExpiresAt.toISOString(),
        openNonceHash: openNonceHash,
        openClientFingerprintHash: openClientFingerprintHash,
        updatedAt: now.toISOString(),
      })
      .where(
        and(
          eq(pjsTable.tokenHash, tokenHash),
          isNull(pjsTable.usedAt),
          or(
            isNull(pjsTable.openNonceHash),
            isNull(pjsTable.openExpiresAt),
            lte(pjsTable.openExpiresAt, now.toISOString()),
          ),
        ),
      )
      .returning();

    if (locked.length !== 1) {
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

    const refreshed = await db
      .update(pjsTable)
      .set({
        openExpiresAt: openExpiresAt.toISOString(),
        updatedAt: now.toISOString(),
      })
      .where(
        and(
          eq(pjsTable.tokenHash, tokenHash),
          isNull(pjsTable.usedAt),
          eq(pjsTable.openNonceHash, openNonceHash),
          gt(pjsTable.openExpiresAt, now.toISOString()),
        ),
      )
      .returning();

    if (refreshed.length !== 1) {
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
    const judgeSession = await db.query.programmeJudgeSession.findFirst({
      where: eq(pjsTable.tokenHash, tokenHash),
      columns: {
        id: true,
        festivalId: true,
        programmeId: true,
        reportingSessionId: true,
        usedAt: true,
        openNonceHash: true,
        openExpiresAt: true,
      },
    });

    if (!judgeSession || judgeSession.usedAt) {
      throw new AppError("Judging closed.");
    }
    const now = new Date();
    const providedOpenNonceHash = hashValueSHA256(openNonce);
    if (
      !judgeSession.openNonceHash ||
      judgeSession.openNonceHash !== providedOpenNonceHash ||
      !judgeSession.openExpiresAt ||
      new Date(judgeSession.openExpiresAt).getTime() <= now.getTime()
    ) {
      throw new AppError("Link expired or already in use.");
    }

    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, judgeSession.programmeId),
      columns: { id: true, status: true, festivalId: true, type: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    if (programme.festivalId !== judgeSession.festivalId) {
      throw new AppError("Judging closed.");
    }
    if (programme.status !== "STARTED") {
      throw new AppError("Judging closed.");
    }

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, judgeSession.festivalId),
      columns: { tier: true, slug: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

    const tier = (festival.tier || "BASIC") as "BASIC" | "STANDARD" | "PRO";
    const canUseJudging = await getEffectiveFeatureTagEnabled(
      tier,
      "eventWorks.externalJudging",
    );
    if (!canUseJudging) throw new AppError("Judging closed.");

    const codeLetters = await db.query.programmeCodeLetter.findMany({
      where: and(
        eq(codeLetterTable.programmeId, judgeSession.programmeId),
        eq(codeLetterTable.reportingSessionId, judgeSession.reportingSessionId),
      ),
      orderBy: [asc(codeLetterTable.issuedAt)],
      with: {
        recipients: { columns: { studentId: true } },
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

    const allStudentIds = Array.from(
      new Set(
        codeLetters.flatMap((cl) => cl.recipients.map((r) => r.studentId)),
      ),
    );
    if (allStudentIds.length === 0) throw new AppError("Judging closed.");

    const assignments = await db.query.programmeAssignment.findMany({
      where: and(
        eq(assignmentTable.programmeId, judgeSession.programmeId),
        inArray(assignmentTable.studentId, allStudentIds),
      ),
      columns: { id: true, studentId: true },
    });
    const assignmentByStudentId = new Map(
      assignments.map((a) => [a.studentId, a.id]),
    );

    for (const sid of allStudentIds) {
      if (!assignmentByStudentId.get(sid)) {
        throw new AppError("Judging closed.");
      }
    }

    await db.transaction(async (tx) => {
      const nowStr = now.toISOString();
      const usedUpdate = await tx
        .update(pjsTable)
        .set({
          usedAt: nowStr,
          endedAt: nowStr,
          submittedByName: normalizedJudge.judgeName,
          submittedByContact: normalizedJudge.judgeContact,
          submittedByNote: normalizedJudge.judgeNote,
          openNonceHash: null,
          openedAt: null,
          openExpiresAt: null,
          openClientFingerprintHash: null,
          updatedAt: nowStr,
        })
        .where(
          and(
            eq(pjsTable.tokenHash, tokenHash),
            isNull(pjsTable.usedAt),
            eq(pjsTable.openNonceHash, providedOpenNonceHash),
            gt(pjsTable.openExpiresAt, nowStr),
          ),
        )
        .returning();

      if (usedUpdate.length !== 1) {
        throw new AppError("Link expired or already in use.");
      }

      await tx
        .update(pjsTable)
        .set({
          usedAt: nowStr,
          endedAt: nowStr,
          openNonceHash: null,
          openedAt: null,
          openExpiresAt: null,
          openClientFingerprintHash: null,
          updatedAt: nowStr,
        })
        .where(
          and(
            eq(pjsTable.programmeId, judgeSession.programmeId),
            isNull(pjsTable.usedAt),
          ),
        );

      for (const cl of codeLetters) {
        const pts = pointsByCodeResolved.get(cl.code)!;
        const roundedPoints = Math.round(pts);
        const { grade, remarks } = gradeByCode.get(cl.code)!;
        const position = positionByCode.get(cl.code)!;

        const assignmentIds = cl.recipients
          .map((r) => assignmentByStudentId.get(r.studentId))
          .filter((id): id is string => Boolean(id));

        if (assignmentIds.length === 0) {
          throw new AppError("Judging closed.");
        }

        for (const assignmentId of assignmentIds) {
          await tx
            .insert(resultTable)
            .values({
              id: randomUUID(),
              festivalId: judgeSession.festivalId,
              programmeId: judgeSession.programmeId,
              assignmentId,
              grade,
              position,
              points: roundedPoints,
              remarks,
              isPublished: false,
              updatedAt: nowStr,
            })
            .onConflictDoUpdate({
              target: resultTable.assignmentId,
              set: {
                grade,
                position,
                points: roundedPoints,
                remarks,
                isPublished: false,
                updatedAt: nowStr,
              },
            });
        }
      }
    });

    await updateProgrammeStatus(
      judgeSession.programmeId,
      judgeSession.reportingSessionId,
    );
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
