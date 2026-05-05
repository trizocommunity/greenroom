"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { APP_URL } from "@/config/routes";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  judge as judgeTable,
  judgmentConfig as judgmentConfigTable,
  judgmentConfigJudge as judgmentConfigJudgeTable,
  judgmentLink as judgmentLinkTable,
  judgmentScore as judgmentScoreTable,
  programme as programmeTable,
  programmeAssignment as assignmentTable,
  programmeCodeLetter as codeLetterTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
} from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";
import {
  calculateGrade,
  calculatePosition,
} from "@/features/results/services/results-calculator";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import {
  getScoringPolicyWithRules,
  resolveScoringPolicy,
  upsertScoringPolicyActionData,
} from "@/features/judgment/services/scoring-policy.service";

function hashTokenSHA256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function allAssignedJudgesHaveCompleteScores(
  configId: string,
  codeLetterIds: string[],
): Promise<boolean> {
  if (codeLetterIds.length === 0) return true;
  const assigned = await db.query.judgmentConfigJudge.findMany({
    where: eq(judgmentConfigJudgeTable.configId, configId),
    columns: { judgeId: true },
  });
  if (assigned.length === 0) return true;
  const letterSet = new Set(codeLetterIds);
  const rows = await db.query.judgmentScore.findMany({
    where: eq(judgmentScoreTable.configId, configId),
    columns: { judgeId: true, codeLetterId: true },
  });
  for (const { judgeId } of assigned) {
    const covered = new Set(
      rows
        .filter((r) => r.judgeId === judgeId && letterSet.has(r.codeLetterId))
        .map((r) => r.codeLetterId),
    );
    if (covered.size !== codeLetterIds.length) return false;
  }
  return true;
}

function generateJudgeToken(): string {
  return randomBytes(32).toString("base64url");
}

function generatePin(length: number): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

async function createJudgeLinkAccessSession(payload: {
  linkId: string;
  tokenHash: string;
  deviceHash: string | null;
  expiresAt: string;
}) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(new Date(payload.expiresAt).getTime() / 1000))
    .sign(getJwtSecretKey());

  const cookieStore = await cookies();
  cookieStore.set("judge_link_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(payload.expiresAt),
    path: "/",
  });
}

async function readJudgeLinkAccessSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("judge_link_auth")?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as {
      linkId: string;
      tokenHash: string;
      deviceHash: string | null;
      expiresAt: string;
    };
  } catch {
    return null;
  }
}

export async function getJudgmentWizardDataAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const [judgeProgrammes, rejudgeProgrammes, judges] = await Promise.all([
    db.query.programme.findMany({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        or(
          eq(programmeTable.status, "STARTED"),
          and(
            eq(programmeTable.status, "REPORTING"),
            exists(
              db
                .select({ one: sql`1` })
                .from(reportingSessionTable)
                .where(
                  and(
                    eq(reportingSessionTable.programmeId, programmeTable.id),
                    eq(reportingSessionTable.status, "CLOSED"),
                  ),
                ),
            ),
          ),
        ),
      ),
      columns: { id: true, name: true, status: true },
      with: { category: { columns: { name: true } } },
      orderBy: [asc(programmeTable.name)],
    }),
    db.query.programme.findMany({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        inArray(programmeTable.status, ["JUDGED", "ENDED"]),
      ),
      columns: { id: true, name: true, status: true },
      with: { category: { columns: { name: true } } },
      orderBy: [asc(programmeTable.name)],
    }),
    db.query.judge.findMany({
      where: eq(judgeTable.festivalId, festivalId),
      columns: { id: true, name: true, description: true },
      orderBy: [asc(judgeTable.name)],
    }),
  ]);

  const programmeIds = Array.from(
    new Set([
      ...judgeProgrammes.map((p) => p.id),
      ...rejudgeProgrammes.map((p) => p.id),
    ]),
  );

  const latestClosedSessions =
    programmeIds.length > 0
      ? await db.query.programmeReportingSession.findMany({
          where: and(
            eq(reportingSessionTable.festivalId, festivalId),
            inArray(reportingSessionTable.programmeId, programmeIds),
            eq(reportingSessionTable.status, "CLOSED"),
          ),
          orderBy: [desc(reportingSessionTable.endedAt)],
          with: {
            stage: { columns: { name: true } },
            scheduleEntry: {
              columns: { startTime: true, endTime: true },
              with: { stage: { columns: { name: true } } },
            },
            programmeReportedParticipants: {
              orderBy: [asc(reportedParticipantTable.reportedAt)],
              with: {
                student: { columns: { name: true, chestNumber: true } },
                group: { columns: { name: true } },
                programmeAssignment: { columns: { teamNumber: true } },
              },
            },
          },
        })
      : [];

  const reportingByProgrammeId = new Map<
    string,
    {
      stageName: string | null;
      scheduleStart: string | null;
      scheduleEnd: string | null;
      reportedCount: number;
      reportedStudents: string[];
    }
  >();

  for (const sessionRow of latestClosedSessions) {
    if (reportingByProgrammeId.has(sessionRow.programmeId)) continue;
    const reportedStudents = sessionRow.programmeReportedParticipants
      .map((r) => {
        if (r.student?.name) {
          return r.student.chestNumber
            ? `${r.student.name} (${r.student.chestNumber})`
            : r.student.name;
        }
        if (r.group?.name) {
          const teamNo = r.teamNumber ?? r.programmeAssignment?.teamNumber;
          return teamNo ? `${r.group.name} - Team ${teamNo}` : r.group.name;
        }
        return null;
      })
      .filter((x): x is string => Boolean(x));

    reportingByProgrammeId.set(sessionRow.programmeId, {
      stageName: sessionRow.stage?.name ?? sessionRow.scheduleEntry?.stage?.name ?? null,
      scheduleStart: sessionRow.scheduleEntry?.startTime ?? null,
      scheduleEnd: sessionRow.scheduleEntry?.endTime ?? null,
      reportedCount: reportedStudents.length,
      reportedStudents,
    });
  }

  return {
    judgeProgrammes: judgeProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      programmeCategory: p.category?.name ?? null,
      reportingDetails: reportingByProgrammeId.get(p.id) ?? null,
    })),
    rejudgeProgrammes: rejudgeProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      programmeCategory: p.category?.name ?? null,
      reportingDetails: reportingByProgrammeId.get(p.id) ?? null,
    })),
    judges,
  };
}

export async function getActiveJudgmentConfigsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const configs = await db.query.judgmentConfig.findMany({
    where: and(
      eq(judgmentConfigTable.festivalId, festivalId),
      eq(judgmentConfigTable.status, "ACTIVE"),
    ),
    orderBy: [desc(judgmentConfigTable.createdAt)],
    with: {
      programme: {
        columns: { id: true, name: true, status: true },
        with: { category: { columns: { name: true } } },
      },
      judges: {
        with: {
          judge: { columns: { id: true, name: true } },
        },
      },
      links: {
        where: eq(judgmentLinkTable.isActive, true),
        orderBy: [desc(judgmentLinkTable.createdAt)],
        limit: 1,
      },
    },
  });

  return configs.map((c) => ({
    id: c.id,
    programmeId: c.programme.id,
    programmeName: c.programme.name,
    programmeStatus: c.programme.status,
    programmeCategory: c.programme.category?.name ?? null,
    scoreLimit: c.scoreLimit,
    judgingMode: c.judgingMode as "SINGLE" | "GROUP",
    judges: c.judges.map((j) => ({ id: j.judge.id, name: j.judge.name })),
    activeLinkId: c.links[0]?.id ?? null,
  }));
}

export async function getJudgedProgrammeCardsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const configs = await db.query.judgmentConfig.findMany({
    where: eq(judgmentConfigTable.festivalId, festivalId),
    orderBy: [desc(judgmentConfigTable.createdAt)],
    with: {
      programme: {
        columns: { id: true, name: true, status: true },
        with: { category: { columns: { name: true } } },
      },
      judges: { with: { judge: { columns: { id: true, name: true } } } },
      scores: {
        with: {
          judge: { columns: { id: true, name: true } },
          programmeCodeLetter: { columns: { id: true, code: true } },
        },
      },
    },
  });

  const latestWithScoresByProgramme = new Map<
    string,
    (typeof configs)[number]
  >();
  for (const config of configs) {
    if (config.scores.length === 0) continue;
    if (!latestWithScoresByProgramme.has(config.programme.id)) {
      latestWithScoresByProgramme.set(config.programme.id, config);
    }
  }

  const judgedCards = Array.from(latestWithScoresByProgramme.values()).map(
    (config) => {
      const judgeSubmittedAt = new Map<string, string>();
      const byCodeLetter = new Map<
        string,
        {
          codeLetterId: string;
          code: string;
          judgeScores: Record<string, number>;
        }
      >();

      for (const score of config.scores) {
        const prevSubmittedAt = judgeSubmittedAt.get(score.judgeId);
        if (
          !prevSubmittedAt ||
          new Date(score.updatedAt) > new Date(prevSubmittedAt)
        ) {
          judgeSubmittedAt.set(score.judgeId, score.updatedAt);
        }

        const key = score.codeLetterId;
        const existing = byCodeLetter.get(key) ?? {
          codeLetterId: score.codeLetterId,
          code: score.programmeCodeLetter.code,
          judgeScores: {},
        };
        existing.judgeScores[score.judgeId] = score.score;
        byCodeLetter.set(key, existing);
      }

      const codeLetterRows = Array.from(byCodeLetter.values())
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((row) => {
          const values = Object.values(row.judgeScores);
          const average =
            values.length > 0
              ? values.reduce((sum, v) => sum + v, 0) / values.length
              : 0;
          return { ...row, average };
        });

      return {
        configId: config.id,
        programmeId: config.programme.id,
        programmeName: config.programme.name,
        programmeStatus: config.programme.status,
        programmeCategory: config.programme.category?.name ?? null,
        scoreLimit: config.scoreLimit,
        judgingMode: config.judgingMode as "SINGLE" | "GROUP",
        judges: config.judges.map((j) => ({
          id: j.judge.id,
          name: j.judge.name,
          submittedAt: judgeSubmittedAt.get(j.judge.id) ?? null,
        })),
        codeLetterRows,
        totalJudgments: config.scores.length,
      };
    },
  );

  return judgedCards;
}

export async function getJudgmentDashboardDataAction(festivalId: string) {
  const [wizardData, activeConfigs, judgedProgrammes] = await Promise.all([
    getJudgmentWizardDataAction(festivalId),
    getActiveJudgmentConfigsAction(festivalId),
    getJudgedProgrammeCardsAction(festivalId),
  ]);

  return {
    judgeProgrammes: wizardData.judgeProgrammes,
    rejudgeProgrammes: wizardData.rejudgeProgrammes,
    judges: wizardData.judges,
    activeConfigs,
    judgedProgrammes,
  };
}

export async function createJudgmentConfigurationAction(input: {
  festivalId: string;
  programmeId: string;
  scoreLimit: number;
  judgeIds: string[];
  judgingMode?: "SINGLE" | "GROUP";
  manualPin?: string | null;
  pinLength?: 4 | 5 | 6;
  expiresInHours?: number;
}) {
  const session = await getSession();
  await assertFestivalAccess(session, input.festivalId, {
    requireWritable: true,
  });

  if (!Number.isFinite(input.scoreLimit) || input.scoreLimit <= 0) {
    throw new AppError("Score limit must be greater than 0.");
  }
  if (!input.judgeIds.length)
    throw new AppError("Please select at least one judge.");

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, input.festivalId),
    columns: { slug: true },
  });
  if (!festival) throw new AppError("Festival not found.");

  const latestClosedReportingSession =
    await db.query.programmeReportingSession.findFirst({
      where: and(
        eq(reportingSessionTable.programmeId, input.programmeId),
        eq(reportingSessionTable.status, "CLOSED"),
      ),
      orderBy: [desc(reportingSessionTable.endedAt)],
      columns: { id: true },
    });
  if (!latestClosedReportingSession) {
    throw new AppError("No closed reporting session found for this programme.");
  }

  const now = new Date().toISOString();
  const token = generateJudgeToken();
  const tokenHash = hashTokenSHA256(token);
  const pin =
    input.manualPin?.trim() || generatePin(Number(input.pinLength ?? 4));
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError("PIN must be 4 to 6 digits.");
  }
  const pinHash = await bcrypt.hash(pin, 10);
  const expiresAt = new Date(
    Date.now() + Math.max(1, input.expiresInHours ?? 24) * 60 * 60 * 1000,
  ).toISOString();
  const configId = randomUUID();
  const linkId = randomUUID();
  const existingActiveConfigs = await db.query.judgmentConfig.findMany({
    where: and(
      eq(judgmentConfigTable.festivalId, input.festivalId),
      eq(judgmentConfigTable.programmeId, input.programmeId),
      eq(judgmentConfigTable.status, "ACTIVE"),
    ),
    columns: { id: true },
  });
  const existingConfigIds = existingActiveConfigs.map((c) => c.id);

  await db.transaction(async (tx) => {
    await tx
      .update(judgmentConfigTable)
      .set({ status: "ARCHIVED", updatedAt: now })
      .where(
        and(
          eq(judgmentConfigTable.festivalId, input.festivalId),
          eq(judgmentConfigTable.programmeId, input.programmeId),
          eq(judgmentConfigTable.status, "ACTIVE"),
        ),
      );

    if (existingConfigIds.length > 0) {
      await tx
        .update(judgmentLinkTable)
        .set({ isActive: false, regeneratedAt: now })
        .where(
          and(
            eq(judgmentLinkTable.isActive, true),
            inArray(judgmentLinkTable.configId, existingConfigIds),
          ),
        );
    }

    await tx.insert(judgmentConfigTable).values({
      id: configId,
      festivalId: input.festivalId,
      programmeId: input.programmeId,
      reportingSessionId: latestClosedReportingSession.id,
      scoreLimit: Math.round(input.scoreLimit),
      judgingMode: input.judgingMode ?? "GROUP",
      status: "ACTIVE",
      createdBy: session?.userId ?? null,
      createdAt: now,
      updatedAt: now,
    } as any);

    for (const judgeId of input.judgeIds) {
      await tx.insert(judgmentConfigJudgeTable).values({
        id: randomUUID(),
        configId,
        judgeId,
      } as any);
    }

    await tx.insert(judgmentLinkTable).values({
      id: linkId,
      configId,
      tokenHash,
      pinHash,
      isActive: true,
      expiresAt,
      maxAttempts: 5,
      attempts: 0,
      lockedUntil: null,
      boundDeviceHash: null,
      createdAt: now,
      regeneratedAt: null,
    } as any);
  });

  const base = APP_URL.replace(/\/$/, "");
  const judgeUrl = `${base}/${festival.slug}/judge/${token}`;
  revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);
  return { configId, judgeUrl, judgePin: pin, expiresAt };
}

export async function regenerateJudgmentConfigurationLinkAction(input: {
  festivalId: string;
  configId: string;
  manualPin?: string | null;
  pinLength?: 4 | 5 | 6;
  expiresInHours?: number;
}) {
  const session = await getSession();
  await assertFestivalAccess(session, input.festivalId, {
    requireWritable: true,
  });

  const config = await db.query.judgmentConfig.findFirst({
    where: and(
      eq(judgmentConfigTable.id, input.configId),
      eq(judgmentConfigTable.festivalId, input.festivalId),
    ),
    columns: { id: true, festivalId: true },
  });
  if (!config) throw new AppError("Judgment configuration not found.");

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, config.festivalId),
    columns: { slug: true },
  });
  if (!festival) throw new AppError("Festival not found.");

  const now = new Date().toISOString();
  const token = generateJudgeToken();
  const tokenHash = hashTokenSHA256(token);
  const pin =
    input.manualPin?.trim() || generatePin(Number(input.pinLength ?? 4));
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError("PIN must be 4 to 6 digits.");
  }
  const pinHash = await bcrypt.hash(pin, 10);
  const expiresAt = new Date(
    Date.now() + Math.max(1, input.expiresInHours ?? 24) * 60 * 60 * 1000,
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(judgmentLinkTable)
      .set({ isActive: false, regeneratedAt: now })
      .where(eq(judgmentLinkTable.configId, config.id));

    await tx.insert(judgmentLinkTable).values({
      id: randomUUID(),
      configId: config.id,
      tokenHash,
      pinHash,
      isActive: true,
      expiresAt,
      maxAttempts: 5,
      attempts: 0,
      lockedUntil: null,
      boundDeviceHash: null,
      createdAt: now,
      regeneratedAt: null,
    } as any);
  });

  const base = APP_URL.replace(/\/$/, "");
  const judgeUrl = `${base}/${festival.slug}/judge/${token}`;
  revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);
  return { judgeUrl, judgePin: pin, expiresAt };
}

export async function getPublicJudgmentByTokenAction(params: {
  festivalSlug: string;
  token: string;
}) {
  const tokenHash = hashTokenSHA256(params.token);
  const link = await db.query.judgmentLink.findFirst({
    where: eq(judgmentLinkTable.tokenHash, tokenHash),
    with: {
      judgmentConfig: {
        with: {
          festival: { columns: { id: true, slug: true, name: true } },
          programme: { columns: { id: true, name: true, type: true } },
          judges: {
            with: {
              judge: { columns: { id: true, name: true, description: true } },
            },
          },
        },
      },
    },
  });
  if (!link) return null;
  if (link.judgmentConfig.festival.slug !== params.festivalSlug) return null;

  const expiredByTime = new Date(link.expiresAt).getTime() <= Date.now();
  if (!link.isActive || expiredByTime) {
    return {
      expired: true as const,
      reason: expiredByTime ? ("time" as const) : ("closed" as const),
      festival: link.judgmentConfig.festival,
      programme: { name: link.judgmentConfig.programme.name },
    };
  }

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: and(
      eq(codeLetterTable.programmeId, link.judgmentConfig.programmeId),
      eq(
        codeLetterTable.reportingSessionId,
        link.judgmentConfig.reportingSessionId,
      ),
    ),
    orderBy: [asc(codeLetterTable.issuedAt)],
    with: { programmeCodeLetterRecipients: { columns: { studentId: true } } },
  });

  const existingScores = await db.query.judgmentScore.findMany({
    where: eq(judgmentScoreTable.configId, link.configId),
    columns: { judgeId: true, codeLetterId: true, score: true },
  });

  const accessSession = await readJudgeLinkAccessSession();
  const isDeviceBound = Boolean(link.boundDeviceHash);
  const isSessionValid =
    Boolean(accessSession) &&
    accessSession?.linkId === link.id &&
    accessSession?.tokenHash === tokenHash &&
    (!isDeviceBound || accessSession?.deviceHash === link.boundDeviceHash);
  const isLocked =
    Boolean(link.lockedUntil) &&
    new Date(link.lockedUntil!).getTime() > Date.now();

  return {
    linkId: link.id,
    configId: link.configId,
    scoreLimit: link.judgmentConfig.scoreLimit,
    judgingMode: (link.judgmentConfig.judgingMode ?? "GROUP") as
      | "SINGLE"
      | "GROUP",
    festival: link.judgmentConfig.festival,
    programme: link.judgmentConfig.programme,
    judges: link.judgmentConfig.judges.map((j) => j.judge),
    codeLetters: codeLetters.map((c) => ({ id: c.id, code: c.code })),
    existingScores: isSessionValid ? existingScores : [],
    requiresPin: !isSessionValid,
    attemptsRemaining: Math.max(
      0,
      (link.maxAttempts ?? 5) - (link.attempts ?? 0),
    ),
    lockUntil: isLocked ? link.lockedUntil : null,
    expiresAt: link.expiresAt,
  };
}

export async function verifyJudgmentLinkPinAction(input: {
  token: string;
  pin: string;
  deviceId?: string | null;
}) {
  const tokenHash = hashTokenSHA256(input.token);
  const link = await db.query.judgmentLink.findFirst({
    where: and(
      eq(judgmentLinkTable.tokenHash, tokenHash),
      eq(judgmentLinkTable.isActive, true),
    ),
    columns: {
      id: true,
      pinHash: true,
      expiresAt: true,
      attempts: true,
      maxAttempts: true,
      lockedUntil: true,
      boundDeviceHash: true,
    },
  });
  if (!link) throw new AppError("Invalid or expired link.");
  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    throw new AppError("This judgment link has expired.");
  }
  if (link.lockedUntil && new Date(link.lockedUntil).getTime() > Date.now()) {
    throw new AppError("Too many attempts. Link is temporarily locked.");
  }

  const pin = input.pin.trim();
  if (!/^\d{4,6}$/.test(pin))
    throw new AppError("Enter a valid 4-6 digit PIN.");
  const isValid = await bcrypt.compare(pin, link.pinHash);
  const deviceHash = input.deviceId?.trim()
    ? hashTokenSHA256(input.deviceId.trim())
    : null;

  if (!isValid) {
    const nextAttempts = (link.attempts ?? 0) + 1;
    const maxAttempts = link.maxAttempts ?? 5;
    const shouldLock = nextAttempts >= maxAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
      : null;

    await db
      .update(judgmentLinkTable)
      .set({
        attempts: shouldLock ? 0 : nextAttempts,
        lockedUntil,
      } as any)
      .where(eq(judgmentLinkTable.id, link.id));

    if (shouldLock) {
      throw new AppError(
        "Too many incorrect attempts. Try again in 10 minutes.",
      );
    }
    throw new AppError(
      `Incorrect PIN. ${maxAttempts - nextAttempts} attempts left.`,
    );
  }

  await db
    .update(judgmentLinkTable)
    .set({
      attempts: 0,
      lockedUntil: null,
      boundDeviceHash: link.boundDeviceHash ?? deviceHash,
    } as any)
    .where(eq(judgmentLinkTable.id, link.id));

  await createJudgeLinkAccessSession({
    linkId: link.id,
    tokenHash,
    deviceHash,
    expiresAt: link.expiresAt,
  });

  return { success: true };
}

export async function submitJudgeScoresAction(
  input: {
    token: string;
    judgeId: string;
    scoresByCodeLetterId: Record<string, number>;
  },
  options?: { deactivateLink?: boolean },
) {
  const tokenHash = hashTokenSHA256(input.token);
  const link = await db.query.judgmentLink.findFirst({
    where: and(
      eq(judgmentLinkTable.tokenHash, tokenHash),
      eq(judgmentLinkTable.isActive, true),
    ),
    with: {
      judgmentConfig: {
        columns: {
          id: true,
          programmeId: true,
          reportingSessionId: true,
          scoreLimit: true,
          judgingMode: true,
        },
      },
    },
  });
  if (!link) throw new AppError("Judgment link is invalid or expired.");

  const judgeMembership = await db.query.judgmentConfigJudge.findFirst({
    where: and(
      eq(judgmentConfigJudgeTable.configId, link.configId),
      eq(judgmentConfigJudgeTable.judgeId, input.judgeId),
    ),
    columns: { id: true },
  });
  if (!judgeMembership) throw new AppError("Selected judge is not assigned.");

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: and(
      eq(codeLetterTable.programmeId, link.judgmentConfig.programmeId),
      eq(
        codeLetterTable.reportingSessionId,
        link.judgmentConfig.reportingSessionId,
      ),
    ),
    with: { programmeCodeLetterRecipients: true },
  });
  if (codeLetters.length === 0) throw new AppError("No code letters found.");

  const codeLetterIds = new Set(codeLetters.map((c) => c.id));
  for (const [codeLetterId, score] of Object.entries(
    input.scoresByCodeLetterId,
  )) {
    if (!codeLetterIds.has(codeLetterId)) {
      throw new AppError("Invalid code letter score payload.");
    }
    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > link.judgmentConfig.scoreLimit
    ) {
      throw new AppError(
        `Score must be between 0 and ${link.judgmentConfig.scoreLimit}.`,
      );
    }
  }

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const [codeLetterId, score] of Object.entries(
      input.scoresByCodeLetterId,
    )) {
      await tx
        .insert(judgmentScoreTable)
        .values({
          id: randomUUID(),
          configId: link.configId,
          linkId: link.id,
          judgeId: input.judgeId,
          codeLetterId,
          score,
          submittedAt: now,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: [
            judgmentScoreTable.configId,
            judgmentScoreTable.judgeId,
            judgmentScoreTable.codeLetterId,
          ],
          set: { score, updatedAt: now, submittedAt: now, linkId: link.id },
        });
    }
  });

  const allScores = await db.query.judgmentScore.findMany({
    where: eq(judgmentScoreTable.configId, link.configId),
    columns: { codeLetterId: true, score: true },
  });
  const scoreByCodeLetter = new Map<string, number[]>();
  for (const row of allScores) {
    const arr = scoreByCodeLetter.get(row.codeLetterId) ?? [];
    arr.push(row.score);
    scoreByCodeLetter.set(row.codeLetterId, arr);
  }

  const averageByCodeLetter = new Map<string, number>();
  for (const c of codeLetters) {
    const arr = scoreByCodeLetter.get(c.id) ?? [];
    const avg =
      arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
    averageByCodeLetter.set(c.id, avg);
  }

  const averages = Array.from(averageByCodeLetter.values()).map((v) =>
    Math.round(v),
  );
  const assignmentPoints = new Map<string, number>();
  const programmeRow = await db.query.programme.findFirst({
    where: eq(programmeTable.id, link.judgmentConfig.programmeId),
    columns: { festivalId: true, categoryId: true, type: true },
    with: { festival: { columns: { tier: true } } },
  });
  if (!programmeRow) throw new AppError("Programme not found.");

  for (const cl of codeLetters) {
    const avg = Math.round(averageByCodeLetter.get(cl.id) ?? 0);
    for (const recipient of cl.programmeCodeLetterRecipients) {
      const assignment = await db.query.programmeAssignment.findFirst({
        where: and(
          eq(assignmentTable.programmeId, link.judgmentConfig.programmeId),
          eq(assignmentTable.studentId, recipient.studentId),
        ),
        columns: { id: true },
      });
      if (assignment?.id) assignmentPoints.set(assignment.id, avg);
    }
  }

  const judgedAssignmentIds: string[] = [];
  await db.transaction(async (tx) => {
    for (const [assignmentId, pts] of assignmentPoints.entries()) {
      judgedAssignmentIds.push(assignmentId);
      const assignmentRow = await db.query.programmeAssignment.findFirst({
        where: eq(assignmentTable.id, assignmentId),
        columns: { groupId: true, teamNumber: true },
      });

      let participantsCount = 1;
      if (programmeRow.type === "GROUP" && assignmentRow) {
        const teamMembers = await db
          .select({ id: assignmentTable.id })
          .from(assignmentTable)
          .where(
            and(
              eq(assignmentTable.programmeId, link.judgmentConfig.programmeId),
              eq(assignmentTable.teamNumber, assignmentRow.teamNumber ?? 1),
              assignmentRow.groupId
                ? eq(assignmentTable.groupId, assignmentRow.groupId)
                : sql`${assignmentTable.groupId} is null`,
            ),
          );
        participantsCount = Math.max(1, teamMembers.length);
      }

      const policyResolved = await resolveScoringPolicy({
        festivalId: programmeRow.festivalId,
        programme: {
          id: link.judgmentConfig.programmeId,
          categoryId: programmeRow.categoryId,
          type: programmeRow.type,
        },
        participantsCount,
        points: pts,
      });

      const fallbackGradeData = calculateGrade(pts, link.judgmentConfig.scoreLimit);
      const grade = policyResolved.grade ?? fallbackGradeData.grade;
      const remarks =
        policyResolved.grade === null ? "No grade (below threshold)" : fallbackGradeData.remarks;
      const position = calculatePosition(pts, averages);
      await tx
        .insert(resultTable)
        .values({
          id: randomUUID(),
          festivalId: programmeRow.festivalId,
          programmeId: link.judgmentConfig.programmeId,
          assignmentId,
          grade,
          position,
          points: pts,
          awardPoints: policyResolved.awardPoints,
          scoringPolicyVersion: policyResolved.policyVersion,
          remarks,
          isPublished: false,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: resultTable.assignmentId,
          set: {
            grade,
            position,
            points: pts,
            awardPoints: policyResolved.awardPoints,
            scoringPolicyVersion: policyResolved.policyVersion,
            remarks,
            isPublished: false,
            updatedAt: now,
          },
        });
    }

    if (judgedAssignmentIds.length > 0) {
      await tx
        .delete(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, link.judgmentConfig.programmeId),
            notInArray(resultTable.assignmentId, judgedAssignmentIds),
          ),
        );
    }
  });

  await updateProgrammeStatus(
    link.judgmentConfig.programmeId,
    link.judgmentConfig.reportingSessionId,
  );

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, programmeRow.festivalId),
    columns: { slug: true },
  });
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgment`);
    revalidatePath(`/dashboard/${festival.slug}/event-works/results`);
    revalidatePath(`/dashboard/${festival.slug}/event-works/leaderboard`);
    revalidatePath(`/${festival.slug}/results`);
  }

  const mode = (link.judgmentConfig.judgingMode ?? "GROUP") as
    | "SINGLE"
    | "GROUP";
  let shouldDeactivateLink: boolean;
  if (options?.deactivateLink === false) {
    shouldDeactivateLink = false;
  } else if (options?.deactivateLink === true) {
    shouldDeactivateLink = true;
  } else if (mode === "SINGLE") {
    shouldDeactivateLink = await allAssignedJudgesHaveCompleteScores(
      link.configId,
      codeLetters.map((c) => c.id),
    );
  } else {
    shouldDeactivateLink = true;
  }

  if (shouldDeactivateLink) {
    await db
      .update(judgmentLinkTable)
      .set({ isActive: false, regeneratedAt: now } as any)
      .where(eq(judgmentLinkTable.id, link.id));
    const cookieStore = await cookies();
    cookieStore.delete("judge_link_auth");
  }

  return { success: true as const, judgmentComplete: shouldDeactivateLink };
}

export async function submitGroupJudgeScoresAction(input: {
  token: string;
  scoresByJudgeId: Record<string, Record<string, number>>;
}) {
  const judgeEntries = Object.entries(input.scoresByJudgeId);
  if (judgeEntries.length === 0)
    throw new AppError("No judge scores provided.");

  let last: { success: true; judgmentComplete: boolean } = {
    success: true,
    judgmentComplete: true,
  };
  for (let i = 0; i < judgeEntries.length; i++) {
    const [judgeId, scoresByCodeLetterId] = judgeEntries[i]!;
    last = await submitJudgeScoresAction(
      {
        token: input.token,
        judgeId,
        scoresByCodeLetterId,
      },
      { deactivateLink: i === judgeEntries.length - 1 },
    );
  }
  return last;
}

export async function getScoringPolicyAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return getScoringPolicyWithRules(festivalId);
}

export async function saveScoringPolicyAction(input: {
  festivalId: string;
  noGradeBelow: number;
  gradeRules: Array<{ grade: string; min: number; max: number }>;
  awardRules: Array<{
    criteriaType: "PARTICIPANT_RANGE" | "PROGRAMME_SET";
    rowLabel?: string | null;
    programmeIds?: string[] | null;
    categoryId?: string | null;
    minParticipants: number;
    maxParticipants?: number | null;
    grade: string;
    awardPoints: number;
    priority?: number;
  }>;
}) {
  const session = await getSession();
  await assertFestivalAccess(session, input.festivalId, {
    requireWritable: true,
  });

  if (!Number.isFinite(input.noGradeBelow) || input.noGradeBelow < 0 || input.noGradeBelow > 100) {
    throw new AppError("No-grade threshold must be between 0 and 100.");
  }
  if (input.gradeRules.length === 0) {
    throw new AppError("At least one grade rule is required.");
  }

  await upsertScoringPolicyActionData({
    festivalId: input.festivalId,
    noGradeBelow: Math.round(input.noGradeBelow),
    gradeRules: input.gradeRules,
    awardRules: input.awardRules,
    updatedBy: session?.userId ?? null,
  });

  return { success: true as const };
}
