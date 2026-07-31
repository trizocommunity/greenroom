"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
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
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { getStagePortalSessionFromCookie } from "@/core/auth/stage-portal-session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeCodeLetter as codeLetterTable,
  festival as festivalTable,
  judgementConfigJudge as judgementConfigJudgeTable,
  judgementConfig as judgementConfigTable,
  judgementScore as judgementScoreTable,
  programme as programmeTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { dateKeyLocal, isAfter, isBefore, parseInstant } from "@/core/datetime";
import { serverNow, serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import type { ProgrammeJudgementStatus } from "@/core/types/app-enums";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { getFestivalDateKeySet } from "@/features/schedule/utils/festival-schedule-days";
import { listFestivalJudgesWithAssignments } from "@/features/judges/repositories/judge.repository";
import {
  getScoringPolicyWithRules,
  resolveScoringPolicy,
  upsertScoringPolicyActionData,
} from "@/features/judgement/services/scoring-policy.service";
import { getStageIdForReportingSession } from "@/features/programmes/actions/programme-reporting.actions";
import { assertStageManagerAccessForStage } from "@/features/programmes/actions/reporting-access";
import { JudgeStageAssignmentService } from "@/features/stages/services/judge-stage-assignment.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import { calculatePosition } from "@/features/results/services/results-calculator";

async function allAssignedJudgesHaveCompleteScores(
  configId: string,
  codeLetterIds: string[],
): Promise<boolean> {
  if (codeLetterIds.length === 0) return true;
  const assigned = await db.query.judgementConfigJudge.findMany({
    where: eq(judgementConfigJudgeTable.configId, configId),
    columns: { judgeId: true },
  });
  if (assigned.length === 0) return true;
  const letterSet = new Set(codeLetterIds);
  const rows = await db.query.judgementScore.findMany({
    where: eq(judgementScoreTable.configId, configId),
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

export async function getJudgementWizardDataAction(festivalId: string) {
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
      columns: { id: true, name: true, status: true, type: true },
      with: { category: { columns: { name: true } } },
      orderBy: [asc(programmeTable.name)],
    }),
    db.query.programme.findMany({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        inArray(programmeTable.status, ["JUDGED", "ENDED"]),
      ),
      columns: { id: true, name: true, status: true, type: true },
      with: { category: { columns: { name: true } } },
      orderBy: [asc(programmeTable.name)],
    }),
    listFestivalJudgesWithAssignments(festivalId),
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
                participant: {
                  columns: { id: true, name: true, chestNumber: true },
                },
                group: { columns: { name: true } },
                programmeAssignment: { columns: { teamNumber: true } },
              },
            },
          },
        })
      : [];

  const programmeTypeById = new Map<string, "INDIVIDUAL" | "GROUP">([
    ...judgeProgrammes.map((p) => [p.id, p.type] as const),
    ...rejudgeProgrammes.map((p) => [p.id, p.type] as const),
  ]);

  const sessionIds = latestClosedSessions.map((s) => s.id);
  const codeLettersBySessionId = new Map<
    string,
    Array<{ code: string; participantIds: string[] }>
  >();
  const absentBySessionId = new Map<string, number>();

  if (sessionIds.length > 0) {
    const sessionCodeLetters = await db.query.programmeCodeLetter.findMany({
      where: inArray(codeLetterTable.reportingSessionId, sessionIds),
      columns: {
        reportingSessionId: true,
        code: true,
        isAbsent: true,
      },
      with: {
        programmeCodeLetterRecipients: {
          columns: { participantId: true },
        },
      },
    });

    for (const row of sessionCodeLetters) {
      const bucket = codeLettersBySessionId.get(row.reportingSessionId) ?? [];
      bucket.push({
        code: row.code,
        participantIds: row.programmeCodeLetterRecipients.map(
          (r) => r.participantId,
        ),
      });
      codeLettersBySessionId.set(row.reportingSessionId, bucket);
      if (row.isAbsent) {
        absentBySessionId.set(
          row.reportingSessionId,
          (absentBySessionId.get(row.reportingSessionId) ?? 0) + 1,
        );
      }
    }
  }

  // Assigned-unit counts per programme (GROUP → distinct group+team; else rows).
  const assignedUnitsByProgramme = new Map<string, number>();
  if (programmeIds.length > 0) {
    const assignmentRows = await db.query.programmeAssignment.findMany({
      where: inArray(assignmentTable.programmeId, programmeIds),
      columns: { programmeId: true, groupId: true, teamNumber: true },
    });
    const unitSetByProgramme = new Map<string, Set<string>>();
    const countByProgramme = new Map<string, number>();
    for (const a of assignmentRows) {
      const type = programmeTypeById.get(a.programmeId) ?? "INDIVIDUAL";
      if (type === "GROUP") {
        const set = unitSetByProgramme.get(a.programmeId) ?? new Set<string>();
        set.add(`${a.groupId ?? "-"}::${a.teamNumber ?? "-"}`);
        unitSetByProgramme.set(a.programmeId, set);
      } else {
        countByProgramme.set(
          a.programmeId,
          (countByProgramme.get(a.programmeId) ?? 0) + 1,
        );
      }
    }
    for (const id of programmeIds) {
      const type = programmeTypeById.get(id) ?? "INDIVIDUAL";
      assignedUnitsByProgramme.set(
        id,
        type === "GROUP"
          ? (unitSetByProgramme.get(id)?.size ?? 0)
          : (countByProgramme.get(id) ?? 0),
      );
    }
  }

  const reportingByProgrammeId = new Map<
    string,
    {
      stageName: string | null;
      scheduleStart: string | null;
      scheduleEnd: string | null;
      reportedCount: number;
      reportedEntries: Array<{
        label: string;
        groupName: string | null;
        categoryName: string | null;
        codeLetter: string | null;
      }>;
      assignedCount: number;
      absentCount: number;
      stageId: string | null;
    }
  >();

  for (const sessionRow of latestClosedSessions) {
    if (reportingByProgrammeId.has(sessionRow.programmeId)) continue;
    const programmeType =
      programmeTypeById.get(sessionRow.programmeId) ?? "INDIVIDUAL";
    const codeByParticipantId = new Map<string, string>();
    const sessionCodeLetters = codeLettersBySessionId.get(sessionRow.id) ?? [];
    for (const codeLetter of sessionCodeLetters) {
      for (const participantId of codeLetter.participantIds) {
        codeByParticipantId.set(participantId, codeLetter.code);
      }
    }

    const reportedEntries =
      programmeType === "GROUP"
        ? (() => {
            const teamMap = new Map<
              string,
              {
                label: string;
                groupName: string | null;
                categoryName: string | null;
                codeLetter: string | null;
              }
            >();

            for (const r of sessionRow.programmeReportedParticipants) {
              const teamNo = r.teamNumber ?? r.programmeAssignment?.teamNumber;
              const groupName = r.group?.name ?? null;
              const key = `${groupName ?? "no-group"}::${teamNo ?? "no-team"}`;
              const label = groupName
                ? teamNo
                  ? `${groupName} - Team ${teamNo}`
                  : groupName
                : `Team ${teamNo ?? "—"}`;
              const codeLetter = r.participant?.id
                ? (codeByParticipantId.get(r.participant.id) ?? null)
                : null;

              const existing = teamMap.get(key);
              if (!existing) {
                teamMap.set(key, {
                  label,
                  groupName,
                  categoryName: null,
                  codeLetter,
                });
                continue;
              }

              if (!existing.codeLetter && codeLetter) {
                existing.codeLetter = codeLetter;
              }
            }

            return Array.from(teamMap.values());
          })()
        : sessionRow.programmeReportedParticipants
            .map((r) => {
              const teamNo = r.teamNumber ?? r.programmeAssignment?.teamNumber;
              const label = r.participant?.name
                ? r.participant.chestNumber
                  ? `${r.participant.name} (${r.participant.chestNumber})`
                  : r.participant.name
                : r.group?.name
                  ? teamNo
                    ? `${r.group.name} - Team ${teamNo}`
                    : r.group.name
                  : null;
              if (!label) return null;

              return {
                label,
                groupName: r.group?.name ?? null,
                categoryName: null as string | null,
                codeLetter: r.participant?.id
                  ? (codeByParticipantId.get(r.participant.id) ?? null)
                  : null,
              };
            })
            .filter(
              (
                x,
              ): x is {
                label: string;
                groupName: string | null;
                categoryName: string | null;
                codeLetter: string | null;
              } => Boolean(x),
            );

    reportingByProgrammeId.set(sessionRow.programmeId, {
      stageName:
        sessionRow.stage?.name ?? sessionRow.scheduleEntry?.stage?.name ?? null,
      scheduleStart: sessionRow.scheduleEntry?.startTime ?? null,
      scheduleEnd: sessionRow.scheduleEntry?.endTime ?? null,
      reportedCount: reportedEntries.length,
      reportedEntries,
      assignedCount: assignedUnitsByProgramme.get(sessionRow.programmeId) ?? 0,
      absentCount: absentBySessionId.get(sessionRow.id) ?? 0,
      stageId: sessionRow.stageId ?? null,
    });
  }

  return {
    judgeProgrammes: judgeProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      programmeType: p.type,
      programmeCategory: p.category?.name ?? null,
      reportingDetails: reportingByProgrammeId.get(p.id) ?? null,
    })),
    rejudgeProgrammes: rejudgeProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      programmeType: p.type,
      programmeCategory: p.category?.name ?? null,
      reportingDetails: reportingByProgrammeId.get(p.id) ?? null,
    })),
    judges,
  };
}

export async function getActiveJudgementConfigsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const configs = await db.query.judgementConfig.findMany({
    where: and(
      eq(judgementConfigTable.festivalId, festivalId),
      eq(judgementConfigTable.status, "LIVE"),
    ),
    orderBy: [desc(judgementConfigTable.createdAt)],
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
      scores: { columns: { id: true } },
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
    startedAt: c.startedAt,
    startedBy: c.startedBy,
    judgementStatus: (c.scores.length > 0
      ? "SCORING_IN_PROGRESS"
      : "LIVE") as ProgrammeJudgementStatus,
  }));
}

export async function getJudgedProgrammeCardsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const configs = await db.query.judgementConfig.findMany({
    where: eq(judgementConfigTable.festivalId, festivalId),
    orderBy: [desc(judgementConfigTable.createdAt)],
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

  const reportingSessionIds = Array.from(
    new Set(Array.from(latestWithScoresByProgramme.values()).map((c) => c.reportingSessionId))
  );
  
  const allCodeLetters = reportingSessionIds.length > 0
    ? await db.query.programmeCodeLetter.findMany({
        where: inArray(codeLetterTable.reportingSessionId, reportingSessionIds),
        columns: { id: true, code: true, isAbsent: true, reportingSessionId: true },
        with: {
          programmeCodeLetterRecipients: {
            columns: { participantId: true },
          },
        },
      })
    : [];

  const programmeIds = Array.from(latestWithScoresByProgramme.keys());
  
  const allAssignments = programmeIds.length > 0
    ? await db.query.programmeAssignment.findMany({
        where: inArray(assignmentTable.programmeId, programmeIds),
        columns: { id: true, participantId: true, programmeId: true },
      })
    : [];

  const allResults = programmeIds.length > 0
    ? await db.query.result.findMany({
        where: inArray(resultTable.programmeId, programmeIds),
        columns: { assignmentId: true, grade: true, awardPoints: true, programmeId: true },
      })
    : [];

  const resultByCodeLetterId = new Map<string, { grade: string | null; awardPoints: number }>();
  for (const cl of allCodeLetters) {
    const participantId = cl.programmeCodeLetterRecipients[0]?.participantId;
    if (participantId) {
      const assignment = allAssignments.find(a => a.participantId === participantId);
      if (assignment) {
        const result = allResults.find(r => r.assignmentId === assignment.id);
        if (result) {
          resultByCodeLetterId.set(cl.id, { grade: result.grade, awardPoints: result.awardPoints });
        }
      }
    }
  }

  const codeLettersBySession = new Map<string, typeof allCodeLetters>();
  for (const cl of allCodeLetters) {
    const list = codeLettersBySession.get(cl.reportingSessionId) ?? [];
    list.push(cl);
    codeLettersBySession.set(cl.reportingSessionId, list);
  }

  const judgedCards = Array.from(latestWithScoresByProgramme.values()).map(
    (config) => {
      const judgeSubmittedAt = new Map<string, string>();
      const judgeFirstScoredAt = new Map<string, string>();
      const byCodeLetter = new Map<
        string,
        {
          codeLetterId: string;
          code: string;
          isAbsent: boolean;
          judgeScores: Record<string, number>;
        }
      >();

      const sessionCodeLetters = codeLettersBySession.get(config.reportingSessionId) ?? [];
      for (const cl of sessionCodeLetters) {
        byCodeLetter.set(cl.id, {
          codeLetterId: cl.id,
          code: cl.code,
          isAbsent: cl.isAbsent,
          judgeScores: {},
        });
      }

      for (const score of config.scores) {
        const prevFirstScoredAt = judgeFirstScoredAt.get(score.judgeId);
        if (
          !prevFirstScoredAt ||
          isBefore(score.updatedAt, prevFirstScoredAt)
        ) {
          judgeFirstScoredAt.set(score.judgeId, score.updatedAt);
        }

        const prevSubmittedAt = judgeSubmittedAt.get(score.judgeId);
        if (
          !prevSubmittedAt ||
          isAfter(score.updatedAt, prevSubmittedAt)
        ) {
          judgeSubmittedAt.set(score.judgeId, score.updatedAt);
        }

        const key = score.codeLetterId;
        const existing = byCodeLetter.get(key) ?? {
          codeLetterId: score.codeLetterId,
          code: score.programmeCodeLetter.code,
          isAbsent: false,
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
          const res = resultByCodeLetterId.get(row.codeLetterId);
          return {
            ...row,
            average,
            grade: res?.grade ?? null,
            awardPoints: res?.awardPoints ?? null,
          };
        });

      const requiredCodeLetters = codeLetterRows.length;
      const assignedJudgeCount = config.judges.length;
      const judgeProgress = config.judges.map((j) => {
        const judgeCodeLetters = new Set(
          config.scores
            .filter((score) => score.judgeId === j.judge.id)
            .map((score) => score.codeLetterId),
        );
        const scoredCount = judgeCodeLetters.size;
        const isComplete =
          requiredCodeLetters > 0 && scoredCount >= requiredCodeLetters;
        return {
          judgeId: j.judge.id,
          judgeName: j.judge.name,
          scoredCount,
          requiredCount: requiredCodeLetters,
          isComplete,
        };
      });
      const judgesWithCompleteSet = judgeProgress.filter(
        (j) => j.isComplete,
      ).length;
      const isSingle = (config.judgingMode as "SINGLE" | "GROUP") === "SINGLE";
      const isJudgementComplete = isSingle
        ? requiredCodeLetters > 0 &&
          assignedJudgeCount > 0 &&
          judgesWithCompleteSet === assignedJudgeCount
        : config.scores.length > 0;
      const judgementStatus: ProgrammeJudgementStatus = isJudgementComplete
        ? "COMPLETED"
        : isSingle
          ? judgesWithCompleteSet > 0
            ? "AWAITING_JUDGES"
            : "SCORING_IN_PROGRESS"
          : "SCORING_IN_PROGRESS";
      const completionSummary = isSingle
        ? `${judgesWithCompleteSet}/${assignedJudgeCount} judges completed`
        : `${config.scores.length} submitted score entries`;
      const pendingJudgeNames = judgeProgress
        .filter((j) => !j.isComplete)
        .map((j) => j.judgeName);

      return {
        configId: config.id,
        createdAt: config.createdAt,
        programmeId: config.programme.id,
        programmeName: config.programme.name,
        programmeStatus: config.programme.status,
        programmeCategory: config.programme.category?.name ?? null,
        scoreLimit: config.scoreLimit,
        judgingMode: config.judgingMode as "SINGLE" | "GROUP",
        judges: config.judges.map((j) => ({
          id: j.judge.id,
          name: j.judge.name,
          firstScoredAt: judgeFirstScoredAt.get(j.judge.id) ?? null,
          submittedAt: judgeSubmittedAt.get(j.judge.id) ?? null,
        })),
        codeLetterRows,
        requiredCodeLetters,
        totalJudgements: config.scores.length,
        isJudgementComplete,
        judgementStatus,
        completionSummary,
        judgeProgress,
        pendingJudgeNames,
      };
    },
  );

  return judgedCards;
}

export async function getJudgementDashboardDataAction(festivalId: string) {
  const [wizardData, activeConfigs, judgedProgrammes, stageAssignments] =
    await Promise.all([
      getJudgementWizardDataAction(festivalId),
      getActiveJudgementConfigsAction(festivalId),
      getJudgedProgrammeCardsAction(festivalId),
      JudgeStageAssignmentService.listForFestival(festivalId),
    ]);

  // Default judge panel per stage — pre-fills the Start Judgement dialog.
  const judgesByStageId: Record<string, string[]> = {};
  for (const a of stageAssignments) {
    const list = judgesByStageId[a.stageId] ?? [];
    list.push(a.judgeId);
    judgesByStageId[a.stageId] = list;
  }

  return {
    judgeProgrammes: wizardData.judgeProgrammes,
    rejudgeProgrammes: wizardData.rejudgeProgrammes,
    judges: wizardData.judges,
    activeConfigs,
    judgedProgrammes,
    judgesByStageId,
  };
}

/**
 * Archives any LIVE config on the given stage (across all its programmes)
 * and inserts a fresh LIVE config + judge assignments. Shared by
 * startJudgementAction and restartJudgementAction so only one programme is
 * ever "live" per stage at a time, matching the single-live-card portal UI.
 */
async function insertLiveJudgementConfig(input: {
  festivalId: string;
  programmeId: string;
  reportingSessionId: string;
  stageId: string;
  judgeIds: string[];
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  startedBy: string;
}): Promise<string> {
  const now = serverNowIso();
  const configId = randomUUID();

  const liveConfigsOnStage = await db
    .select({ id: judgementConfigTable.id })
    .from(judgementConfigTable)
    .innerJoin(
      reportingSessionTable,
      eq(judgementConfigTable.reportingSessionId, reportingSessionTable.id),
    )
    .where(
      and(
        eq(reportingSessionTable.stageId, input.stageId),
        eq(judgementConfigTable.status, "LIVE"),
      ),
    );

  await db.transaction(async (tx) => {
    if (liveConfigsOnStage.length > 0) {
      await tx
        .update(judgementConfigTable)
        .set({ status: "ARCHIVED", updatedAt: now } as any)
        .where(
          inArray(
            judgementConfigTable.id,
            liveConfigsOnStage.map((c) => c.id),
          ),
        );
    }

    await tx.insert(judgementConfigTable).values({
      id: configId,
      festivalId: input.festivalId,
      programmeId: input.programmeId,
      reportingSessionId: input.reportingSessionId,
      scoreLimit: Math.round(input.scoreLimit),
      judgingMode: input.judgingMode,
      status: "LIVE",
      startedAt: now,
      startedBy: input.startedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    for (const judgeId of input.judgeIds) {
      await tx.insert(judgementConfigJudgeTable).values({
        id: randomUUID(),
        configId,
        judgeId,
      } as any);
    }
  });

  return configId;
}

export async function startJudgementAction(input: {
  festivalId: string;
  programmeId: string;
  judgeIds: string[];
  scoreLimit: number;
  judgingMode?: "SINGLE" | "GROUP";
}) {
  if (!Number.isFinite(input.scoreLimit) || input.scoreLimit <= 0) {
    throw new AppError("Score limit must be greater than 0.");
  }
  if (!input.judgeIds.length) {
    throw new AppError("Please select at least one judge.");
  }

  const latestClosedReportingSession =
    await db.query.programmeReportingSession.findFirst({
      where: and(
        eq(reportingSessionTable.programmeId, input.programmeId),
        eq(reportingSessionTable.status, "CLOSED"),
      ),
      orderBy: [desc(reportingSessionTable.endedAt)],
      columns: { id: true, stageId: true },
    });
  if (!latestClosedReportingSession) {
    throw new AppError("No closed reporting session found for this programme.");
  }
  if (!latestClosedReportingSession.stageId) {
    throw new AppError(
      "This programme isn't linked to a stage; the judge portal requires a stage assignment.",
    );
  }

  const actorName = await assertStageManagerAccessForStage(
    input.festivalId,
    latestClosedReportingSession.stageId,
  );

  const configId = await insertLiveJudgementConfig({
    festivalId: input.festivalId,
    programmeId: input.programmeId,
    reportingSessionId: latestClosedReportingSession.id,
    stageId: latestClosedReportingSession.stageId,
    judgeIds: input.judgeIds,
    scoreLimit: input.scoreLimit,
    judgingMode: input.judgingMode ?? "GROUP",
    startedBy: actorName,
  });

  await createAuditLog({
    action: "START_JUDGEMENT",
    targetType: "PROGRAMME",
    targetId: input.programmeId,
    metadata: { configId, judgeIds: input.judgeIds },
  }).catch((err) => console.error("[AuditLog] START_JUDGEMENT failed", err));

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, input.festivalId),
    columns: { slug: true },
  });
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgement`);
  }

  return { configId };
}

export async function restartJudgementAction(input: {
  festivalId: string;
  programmeId: string;
  judgeIds?: string[];
}) {
  const programmeRow = await db.query.programme.findFirst({
    where: eq(programmeTable.id, input.programmeId),
    columns: { status: true },
  });
  if (!programmeRow) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
  if (["PUBLISHED", "ANNOUNCED"].includes(programmeRow.status)) {
    throw new AppError("Cannot restart judgement after results are published.");
  }

  const priorConfig = await db.query.judgementConfig.findFirst({
    where: and(
      eq(judgementConfigTable.festivalId, input.festivalId),
      eq(judgementConfigTable.programmeId, input.programmeId),
    ),
    orderBy: [desc(judgementConfigTable.createdAt)],
    columns: {
      id: true,
      reportingSessionId: true,
      scoreLimit: true,
      judgingMode: true,
    },
    with: { judges: { columns: { judgeId: true } } },
  });
  if (!priorConfig) {
    throw new AppError("No previous judgement round found for this programme.");
  }

  const judgeIds = input.judgeIds?.length
    ? input.judgeIds
    : priorConfig.judges.map((j) => j.judgeId);
  if (!judgeIds.length) {
    throw new AppError("Please select at least one judge.");
  }

  const stageId = await getStageIdForReportingSession(
    priorConfig.reportingSessionId,
  );
  if (!stageId) {
    throw new AppError(
      "This programme isn't linked to a stage; the judge portal requires a stage assignment.",
    );
  }

  const actorName = await assertStageManagerAccessForStage(
    input.festivalId,
    stageId,
  );

  const configId = await insertLiveJudgementConfig({
    festivalId: input.festivalId,
    programmeId: input.programmeId,
    reportingSessionId: priorConfig.reportingSessionId,
    stageId,
    judgeIds,
    scoreLimit: priorConfig.scoreLimit,
    judgingMode: priorConfig.judgingMode as "SINGLE" | "GROUP",
    startedBy: actorName,
  });

  await createAuditLog({
    action: "START_JUDGEMENT",
    targetType: "PROGRAMME",
    targetId: input.programmeId,
    metadata: { configId, judgeIds, restarted: true },
  }).catch((err) => console.error("[AuditLog] START_JUDGEMENT failed", err));

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, input.festivalId),
    columns: { slug: true },
  });
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgement`);
  }

  return { configId };
}

/**
 * Confirms the caller holds a valid stage-portal session for the stage that
 * owns `configId`, and that the config is still LIVE. This is the judge-side
 * equivalent of the old link-token check — the stage-portal cookie is the
 * credential, there's no per-programme token anymore.
 */
async function assertStagePortalAccessForConfig(configId: string) {
  const stagePortalSession = await getStagePortalSessionFromCookie();
  if (!stagePortalSession) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const config = await db.query.judgementConfig.findFirst({
    where: eq(judgementConfigTable.id, configId),
    columns: {
      id: true,
      programmeId: true,
      reportingSessionId: true,
      scoreLimit: true,
      judgingMode: true,
      status: true,
    },
  });
  if (!config) throw new AppError("Judgement round not found.");
  if (config.status !== "LIVE") {
    throw new AppError("This judgement round is no longer live.");
  }

  const stageId = await getStageIdForReportingSession(
    config.reportingSessionId,
  );
  if (!stageId || stageId !== stagePortalSession.stageId) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return config;
}

export type StagePortalPortalStatus =
  | "SCHEDULED"
  | "REPORTING"
  | "LIVE"
  | "JUDGED";

export async function getStagePortalBoardAction(day?: string) {
  const stagePortalSession = await getStagePortalSessionFromCookie();
  if (!stagePortalSession) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const stageId = stagePortalSession.stageId;
  const stage = { name: stagePortalSession.stage.name };

  // Day range from the festival's start–end; default to today (clamped).
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, stagePortalSession.festivalId),
    columns: { startDate: true, endDate: true, timezone: true },
  });
  const festivalTz = festival?.timezone ?? "UTC";
  const dayKeySet =
    getFestivalDateKeySet(
      festival?.startDate ?? null,
      festival?.endDate ?? null,
      festivalTz,
    ) ?? null;
  const days = dayKeySet ? Array.from(dayKeySet).sort() : [];
  const today = dateKeyLocal(serverNow(), festivalTz);
  let selectedDay =
    day && days.includes(day)
      ? day
      : days.includes(today)
        ? today
        : (days[days.length - 1] ?? today);
  if (days.length === 0) selectedDay = today;

  // The stage's LIVE config (if any) — the single actionable programme.
  const liveConfigRow = await db
    .select({
      id: judgementConfigTable.id,
      programmeId: judgementConfigTable.programmeId,
    })
    .from(judgementConfigTable)
    .innerJoin(
      reportingSessionTable,
      eq(judgementConfigTable.reportingSessionId, reportingSessionTable.id),
    )
    .where(
      and(
        eq(reportingSessionTable.stageId, stageId),
        eq(judgementConfigTable.status, "LIVE"),
      ),
    )
    .limit(1);
  const liveProgrammeId = liveConfigRow[0]?.programmeId ?? null;

  // All PROGRAMME schedule entries on this stage, bucketed to the selected day.
  const stageEntries = await db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.stageId, stageId),
      eq(scheduleEntryTable.type, "PROGRAMME"),
    ),
    columns: { programmeId: true, startTime: true },
    with: { programme: { columns: { id: true, name: true, status: true } } },
    orderBy: [asc(scheduleEntryTable.startTime)],
  });

  const programmes = stageEntries
    .filter(
      (e) => {
        const start = parseInstant(e.startTime);
        return (
          e.programme && start && dateKeyLocal(start, festivalTz) === selectedDay
        );
      },
    )
    .map((e) => {
      const p = e.programme!;
      const judged = ["ENDED", "JUDGED", "PUBLISHED", "ANNOUNCED"].includes(
        p.status,
      );
      const portalStatus: StagePortalPortalStatus =
        p.id === liveProgrammeId
          ? "LIVE"
          : judged
            ? "JUDGED"
            : p.status === "REPORTING"
              ? "REPORTING"
              : "SCHEDULED";
      return {
        programmeId: p.id,
        name: p.name,
        startTime: e.startTime,
        portalStatus,
      };
    });

  // Live scoring payload (only when a LIVE config exists on this stage).
  let live: {
    configId: string;
    scoreLimit: number;
    judgingMode: "SINGLE" | "GROUP";
    programme: { id: string; name: string; type: "INDIVIDUAL" | "GROUP" };
    judges: Array<{ id: string; name: string }>;
    codeLetters: Array<{ id: string; code: string; isAbsent: boolean }>;
    existingScores: Array<{
      judgeId: string;
      codeLetterId: string;
      score: number;
      remark: string | null;
    }>;
    judgeCompletion: Record<string, boolean>;
  } | null = null;

  if (liveConfigRow.length > 0) {
    const config = await db.query.judgementConfig.findFirst({
      where: eq(judgementConfigTable.id, liveConfigRow[0]!.id),
      with: {
        programme: { columns: { id: true, name: true, type: true } },
        judges: { with: { judge: { columns: { id: true, name: true } } } },
      },
    });
    if (config) {
      const codeLetters = await db.query.programmeCodeLetter.findMany({
        where: and(
          eq(codeLetterTable.programmeId, config.programmeId),
          eq(codeLetterTable.reportingSessionId, config.reportingSessionId),
        ),
        orderBy: [asc(codeLetterTable.issuedAt)],
      });
      const existingScores = await db.query.judgementScore.findMany({
        where: eq(judgementScoreTable.configId, config.id),
        columns: {
          judgeId: true,
          codeLetterId: true,
          score: true,
          remark: true,
        },
      });

      const activeCodeIds = codeLetters
        .filter((c) => !c.isAbsent)
        .map((c) => c.id);
      const judgeCompletion: Record<string, boolean> = {};
      for (const j of config.judges) {
        const covered = new Set(
          existingScores
            .filter(
              (s) =>
                s.judgeId === j.judge.id && activeCodeIds.includes(s.codeLetterId),
            )
            .map((s) => s.codeLetterId),
        );
        judgeCompletion[j.judge.id] =
          activeCodeIds.length > 0 && covered.size === activeCodeIds.length;
      }

      live = {
        configId: config.id,
        scoreLimit: config.scoreLimit,
        judgingMode: (config.judgingMode ?? "GROUP") as "SINGLE" | "GROUP",
        programme: config.programme,
        judges: config.judges.map((j) => j.judge),
        codeLetters: codeLetters.map((c) => ({
          id: c.id,
          code: c.code,
          isAbsent: c.isAbsent,
        })),
        existingScores,
        judgeCompletion,
      };
    }
  }

  return { stage, days, selectedDay, programmes, live };
}

/**
 * Recomputes result rows (points/grade/position) for a config from the
 * current judgement scores, ignoring absent code letters, and prunes result
 * rows for assignments that are no longer judged (e.g. now-absent). Shared by
 * score submission and the mark-absent action.
 */
async function recomputeConfigResults(
  config: { id: string; programmeId: string; reportingSessionId: string },
  now: string,
): Promise<void> {
  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: and(
      eq(codeLetterTable.programmeId, config.programmeId),
      eq(codeLetterTable.reportingSessionId, config.reportingSessionId),
    ),
    with: { programmeCodeLetterRecipients: true },
  });
  const activeCodeLetters = codeLetters.filter((c) => !c.isAbsent);

  const allScores = await db.query.judgementScore.findMany({
    where: eq(judgementScoreTable.configId, config.id),
    columns: { codeLetterId: true, score: true },
  });
  const scoreByCodeLetter = new Map<string, number[]>();
  for (const row of allScores) {
    const arr = scoreByCodeLetter.get(row.codeLetterId) ?? [];
    arr.push(row.score);
    scoreByCodeLetter.set(row.codeLetterId, arr);
  }

  const averageByCodeLetter = new Map<string, number>();
  for (const c of activeCodeLetters) {
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
    where: eq(programmeTable.id, config.programmeId),
    columns: { festivalId: true, categoryId: true, type: true },
  });
  if (!programmeRow) throw new AppError("Programme not found.");

  for (const cl of activeCodeLetters) {
    const avg = Math.round(averageByCodeLetter.get(cl.id) ?? 0);
    for (const recipient of cl.programmeCodeLetterRecipients) {
      const assignment = await db.query.programmeAssignment.findFirst({
        where: and(
          eq(assignmentTable.programmeId, config.programmeId),
          eq(assignmentTable.participantId, recipient.participantId),
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
              eq(assignmentTable.programmeId, config.programmeId),
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
          id: config.programmeId,
          categoryId: programmeRow.categoryId,
          type: programmeRow.type,
        },
        participantsCount,
        points: pts,
      });

      const grade = policyResolved.grade;
      const remarks =
        policyResolved.grade === null
          ? "No grade (below threshold)"
          : "Grade resolved by scoring policy";
      const position = calculatePosition(pts, averages);
      await tx
        .insert(resultTable)
        .values({
          id: randomUUID(),
          festivalId: programmeRow.festivalId,
          programmeId: config.programmeId,
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

    // Prune result rows for assignments no longer judged (e.g. now-absent).
    if (judgedAssignmentIds.length > 0) {
      await tx
        .delete(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, config.programmeId),
            notInArray(resultTable.assignmentId, judgedAssignmentIds),
          ),
        );
    } else {
      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, config.programmeId));
    }
  });

  await updateProgrammeStatus(config.programmeId, config.reportingSessionId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, programmeRow.festivalId),
    columns: { slug: true },
  });
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/judgement`);
    revalidatePath(`/dashboard/${festival.slug}/event-works/results`);
    revalidatePath(`/dashboard/${festival.slug}/event-works/leaderboard`);
    revalidatePath(`/${festival.slug}/results`);
  }
}

export async function markCodeLetterAbsenceAction(input: {
  configId: string;
  codeLetterId: string;
  isAbsent: boolean;
}) {
  const config = await assertStagePortalAccessForConfig(input.configId);

  const codeLetter = await db.query.programmeCodeLetter.findFirst({
    where: eq(codeLetterTable.id, input.codeLetterId),
    columns: { id: true, reportingSessionId: true },
  });
  if (
    !codeLetter ||
    codeLetter.reportingSessionId !== config.reportingSessionId
  ) {
    throw new AppError("Code letter not found for this programme.");
  }

  const now = serverNowIso();
  await db.transaction(async (tx) => {
    await tx
      .update(codeLetterTable)
      .set({
        isAbsent: input.isAbsent,
        absentBy: input.isAbsent ? "Stage Portal" : null,
        absentAt: input.isAbsent ? now : null,
      } as any)
      .where(eq(codeLetterTable.id, input.codeLetterId));

    // Marking absent drops any scores already entered for this code so a
    // stale score can't linger or count.
    if (input.isAbsent) {
      await tx
        .delete(judgementScoreTable)
        .where(
          and(
            eq(judgementScoreTable.configId, config.id),
            eq(judgementScoreTable.codeLetterId, input.codeLetterId),
          ),
        );
    }
  });

  await createAuditLog({
    action: "MARK_ABSENT",
    targetType: "JUDGEMENT_SCORE",
    targetId: config.id,
    metadata: {
      programmeId: config.programmeId,
      codeLetterId: input.codeLetterId,
      isAbsent: input.isAbsent,
    },
    actor: { actorId: "stage-portal", actorRole: "JUDGE" },
  }).catch((err) => console.error("[AuditLog] MARK_ABSENT failed", err));

  await recomputeConfigResults(
    {
      id: config.id,
      programmeId: config.programmeId,
      reportingSessionId: config.reportingSessionId,
    },
    now,
  );

  return { success: true as const };
}

export async function submitJudgeScoresAction(
  input: {
    configId: string;
    judgeId: string;
    scoresByCodeLetterId: Record<string, number>;
    remarksByCodeLetterId?: Record<string, string>;
  },
  options?: { deactivateLink?: boolean },
) {
  const config = await assertStagePortalAccessForConfig(input.configId);

  const judgeMembership = await db.query.judgementConfigJudge.findFirst({
    where: and(
      eq(judgementConfigJudgeTable.configId, config.id),
      eq(judgementConfigJudgeTable.judgeId, input.judgeId),
    ),
    columns: { id: true },
  });
  if (!judgeMembership) throw new AppError("Selected judge is not assigned.");

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: and(
      eq(codeLetterTable.programmeId, config.programmeId),
      eq(codeLetterTable.reportingSessionId, config.reportingSessionId),
    ),
    with: { programmeCodeLetterRecipients: true },
  });
  if (codeLetters.length === 0) throw new AppError("No code letters found.");

  // Absent code letters (participant reported but did not perform) are
  // excluded from scoring, averages, results and completion entirely.
  const activeCodeLetters = codeLetters.filter((c) => !c.isAbsent);
  const codeLetterIds = new Set(codeLetters.map((c) => c.id));
  for (const [codeLetterId, score] of Object.entries(
    input.scoresByCodeLetterId,
  )) {
    if (!codeLetterIds.has(codeLetterId)) {
      throw new AppError("Invalid code letter score payload.");
    }
    if (!Number.isFinite(score) || score < 0 || score > config.scoreLimit) {
      throw new AppError(`Score must be between 0 and ${config.scoreLimit}.`);
    }
  }

  const now = serverNowIso();
  await db.transaction(async (tx) => {
    for (const [codeLetterId, score] of Object.entries(
      input.scoresByCodeLetterId,
    )) {
      const remark = input.remarksByCodeLetterId?.[codeLetterId]?.trim() || null;
      await tx
        .insert(judgementScoreTable)
        .values({
          id: randomUUID(),
          configId: config.id,
          judgeId: input.judgeId,
          codeLetterId,
          score,
          remark,
          submittedAt: now,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: [
            judgementScoreTable.configId,
            judgementScoreTable.judgeId,
            judgementScoreTable.codeLetterId,
          ],
          set: { score, remark, updatedAt: now, submittedAt: now },
        });
    }
  });

  // No admin session here — judge auth is the stage-portal cookie + judgeId.
  await createAuditLog({
    action: "SUBMIT_JUDGE_SCORES",
    targetType: "JUDGEMENT_SCORE",
    targetId: config.id,
    metadata: {
      programmeId: config.programmeId,
      judgeId: input.judgeId,
      count: Object.keys(input.scoresByCodeLetterId).length,
    },
    actor: { actorId: input.judgeId, actorRole: "JUDGE" },
  }).catch((err) =>
    console.error("[AuditLog] SUBMIT_JUDGE_SCORES failed", err),
  );

  await recomputeConfigResults(
    {
      id: config.id,
      programmeId: config.programmeId,
      reportingSessionId: config.reportingSessionId,
    },
    now,
  );

  const mode = (config.judgingMode ?? "GROUP") as "SINGLE" | "GROUP";
  let shouldComplete: boolean;
  if (options?.deactivateLink === false) {
    shouldComplete = false;
  } else if (options?.deactivateLink === true) {
    shouldComplete = true;
  } else if (mode === "SINGLE") {
    shouldComplete = await allAssignedJudgesHaveCompleteScores(
      config.id,
      activeCodeLetters.map((c) => c.id),
    );
  } else {
    shouldComplete = true;
  }

  if (shouldComplete) {
    await db
      .update(judgementConfigTable)
      .set({
        status: "SUBMITTED",
        endedAt: now,
        endedBy: input.judgeId,
        updatedAt: now,
      } as any)
      .where(eq(judgementConfigTable.id, config.id));
  }

  return { success: true as const, judgementComplete: shouldComplete };
}

export async function previewJudgeSubmissionSummaryAction(input: {
  configId: string;
  scoresByJudgeId: Record<string, Record<string, number>>;
}) {
  const config = await assertStagePortalAccessForConfig(input.configId);

  const assignedJudges = await db.query.judgementConfigJudge.findMany({
    where: eq(judgementConfigJudgeTable.configId, config.id),
    columns: { judgeId: true },
  });
  const assignedJudgeIds = new Set(assignedJudges.map((row) => row.judgeId));
  if (assignedJudgeIds.size === 0) {
    throw new AppError("No judges are assigned for this judgement round.");
  }

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: and(
      eq(codeLetterTable.programmeId, config.programmeId),
      eq(codeLetterTable.reportingSessionId, config.reportingSessionId),
    ),
    with: { programmeCodeLetterRecipients: true },
  });
  if (codeLetters.length === 0) throw new AppError("No code letters found.");
  const activeCodeLetters = codeLetters.filter((c) => !c.isAbsent);
  const validCodeLetterIds = new Set(codeLetters.map((c) => c.id));

  for (const [judgeId, scoresByCodeLetterId] of Object.entries(
    input.scoresByJudgeId,
  )) {
    if (!assignedJudgeIds.has(judgeId)) {
      throw new AppError("Selected judge is not assigned.");
    }
    for (const [codeLetterId, score] of Object.entries(scoresByCodeLetterId)) {
      if (!validCodeLetterIds.has(codeLetterId)) {
        throw new AppError("Invalid code letter score payload.");
      }
      if (!Number.isFinite(score) || score < 0 || score > config.scoreLimit) {
        throw new AppError(`Score must be between 0 and ${config.scoreLimit}.`);
      }
    }
  }

  const allScores = await db.query.judgementScore.findMany({
    where: eq(judgementScoreTable.configId, config.id),
    columns: { judgeId: true, codeLetterId: true, score: true },
  });
  const mergedScores = new Map<string, number>();
  for (const row of allScores) {
    mergedScores.set(`${row.judgeId}:${row.codeLetterId}`, row.score);
  }
  for (const [judgeId, scoresByCodeLetterId] of Object.entries(
    input.scoresByJudgeId,
  )) {
    for (const [codeLetterId, score] of Object.entries(scoresByCodeLetterId)) {
      mergedScores.set(`${judgeId}:${codeLetterId}`, score);
    }
  }

  const programmeRow = await db.query.programme.findFirst({
    where: eq(programmeTable.id, config.programmeId),
    columns: { festivalId: true, categoryId: true, type: true },
  });
  if (!programmeRow) throw new AppError("Programme not found.");

  const rows: Array<{
    codeLetterId: string;
    code: string;
    points: number;
    grade: string | null;
    awardPoints: number;
  }> = [];

  for (const codeLetter of activeCodeLetters) {
    const scoredValues: number[] = [];
    for (const judgeId of assignedJudgeIds) {
      const maybeScore = mergedScores.get(`${judgeId}:${codeLetter.id}`);
      if (maybeScore !== undefined) scoredValues.push(maybeScore);
    }
    const average =
      scoredValues.length > 0
        ? scoredValues.reduce((sum, v) => sum + v, 0) / scoredValues.length
        : 0;
    const points = Math.round(average);

    const firstRecipient = codeLetter.programmeCodeLetterRecipients[0];
    let participantsCount = 1;
    if (firstRecipient) {
      const assignmentRow = await db.query.programmeAssignment.findFirst({
        where: and(
          eq(assignmentTable.programmeId, config.programmeId),
          eq(assignmentTable.participantId, firstRecipient.participantId),
        ),
        columns: { groupId: true, teamNumber: true },
      });

      if (programmeRow.type === "GROUP" && assignmentRow) {
        const teamMembers = await db
          .select({ id: assignmentTable.id })
          .from(assignmentTable)
          .where(
            and(
              eq(assignmentTable.programmeId, config.programmeId),
              eq(assignmentTable.teamNumber, assignmentRow.teamNumber ?? 1),
              assignmentRow.groupId
                ? eq(assignmentTable.groupId, assignmentRow.groupId)
                : sql`${assignmentTable.groupId} is null`,
            ),
          );
        participantsCount = Math.max(1, teamMembers.length);
      }
    }

    const policyResolved = await resolveScoringPolicy({
      festivalId: programmeRow.festivalId,
      programme: {
        id: config.programmeId,
        categoryId: programmeRow.categoryId,
        type: programmeRow.type,
      },
      participantsCount,
      points,
    });

    rows.push({
      codeLetterId: codeLetter.id,
      code: codeLetter.code,
      points,
      grade: policyResolved.grade,
      awardPoints: policyResolved.awardPoints,
    });
  }

  rows.sort((a, b) => a.code.localeCompare(b.code));
  return { rows };
}

export async function submitGroupJudgeScoresAction(input: {
  configId: string;
  scoresByJudgeId: Record<string, Record<string, number>>;
  remarksByJudgeId?: Record<string, Record<string, string>>;
}) {
  const judgeEntries = Object.entries(input.scoresByJudgeId);
  if (judgeEntries.length === 0)
    throw new AppError("No judge scores provided.");

  let last: { success: true; judgementComplete: boolean } = {
    success: true,
    judgementComplete: true,
  };
  for (let i = 0; i < judgeEntries.length; i++) {
    const [judgeId, scoresByCodeLetterId] = judgeEntries[i]!;
    last = await submitJudgeScoresAction(
      {
        configId: input.configId,
        judgeId,
        scoresByCodeLetterId,
        remarksByCodeLetterId: input.remarksByJudgeId?.[judgeId],
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

  if (
    !Number.isFinite(input.noGradeBelow) ||
    input.noGradeBelow < 0 ||
    input.noGradeBelow > 100
  ) {
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
