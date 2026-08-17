import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, inArray, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeAssignment as assignmentTable,
  category as categoryTable,
  programmeCodeLetter as codeLetterTable,
  participant as participantTable,
  programme as programmeTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  result as resultTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { parseInstant } from "@/core/datetime";
import { MS, nowPlus, serverNowIso, serverNowMs } from "@/core/datetime/server";
import { computeWindowEndsAt } from "@/features/programmes/domain/reporting-session.aggregate";
import { teamKey } from "@/features/programmes/domain/team-key";
import { ReportingSessionRepository } from "@/features/programmes/repositories/reporting-session.repository";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import {
  type AccessSession,
  StageAssignmentService,
} from "@/features/stages/services/stage-assignment.service";
import { shuffleInPlace } from "./code-letter-adapter.service";
import { ReportingEventAdapter } from "./reporting-event-adapter.service";
import { groupIntoUnits, planScratchCodes } from "./scratch-code-plan";

async function getOrCreateSessionByProgramme(
  programmeId: string,
  festivalId: string,
) {
  const existing = await db.query.programmeReportingSession.findFirst({
    where: and(
      eq(prsTable.festivalId, festivalId),
      eq(prsTable.programmeId, programmeId),
    ),
    with: {
      scheduleEntry: { with: { programme: true, stage: true } },
      stage: true,
    },
  });
  if (existing) return existing;

  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
    columns: { id: true, festivalId: true },
  });
  if (!programme || programme.festivalId !== festivalId) {
    throw new Error("Programme not found for this festival");
  }

  const latestEntry = await db.query.scheduleEntry.findFirst({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      eq(scheduleEntryTable.programmeId, programmeId),
      eq(scheduleEntryTable.type, "PROGRAMME"),
    ),
    orderBy: [desc(scheduleEntryTable.startTime)],
    columns: { id: true, stageId: true },
  });

  const newId = randomUUID();
  await db.insert(prsTable).values({
    id: newId,
    festivalId,
    scheduleEntryId: latestEntry?.id ?? null,
    programmeId,
    stageId: latestEntry?.stageId ?? null,
    status: "NOT_STARTED",
    updatedAt: serverNowIso(),
  } as any);

  return db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, newId),
    with: {
      scheduleEntry: { with: { programme: true, stage: true } },
      stage: true,
    },
  });
}

async function assertAssignmentCategoryCompatibility(input: {
  programmeId: string;
  participantId: string | null;
}) {
  if (!input.participantId) return;

  const existingAssignment = await db.query.programmeAssignment.findFirst({
    where: and(
      eq(assignmentTable.programmeId, input.programmeId),
      eq(assignmentTable.participantId, input.participantId),
    ),
    columns: { id: true },
  });
  if (existingAssignment) return;

  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, input.programmeId),
    columns: { categoryId: true },
    with: {
      category: { columns: { type: true } },
    },
  });
  if (!programme) throw new Error("Programme not found");
  if (programme.category?.type === "GENERAL") return;

  const participant = await db.query.participant.findFirst({
    where: eq(participantTable.id, input.participantId),
    columns: { categoryId: true },
  });
  if (!participant) throw new Error("Participant not found");

  if (participant.categoryId !== programme.categoryId) {
    throw new Error(
      "Participant category does not match programme category for reporting.",
    );
  }
}

export const ProgrammeReportingService = {
  async reopenLatestClosedSessionByProgramme(
    programmeId: string,
    actorName: string,
  ) {
    const latestClosedSession =
      await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(prsTable.programmeId, programmeId),
          eq(prsTable.status, "CLOSED"),
        ),
        orderBy: [desc(prsTable.endedAt)],
        columns: { id: true },
      });
    if (!latestClosedSession) {
      throw new Error("No closed reporting session found for this programme.");
    }
    return this.reopenClosedSession(latestClosedSession.id, actorName);
  },

  async reopenClosedSession(
    reportingSessionId: string,
    actorName: string,
    opts?: { keepProgrammeInResetStatus?: boolean },
  ) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);
    session.reopen(actorName);

    await db.transaction(async (tx) => {
      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, session.programmeId));
    });

    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);

    await db
      .update(programmeTable)
      .set({
        status: opts?.keepProgrammeInResetStatus ? "CANCELLED" : "SCHEDULED",
        publishedAt: null,
        updatedAt: serverNowIso(),
      })
      .where(eq(programmeTable.id, session.programmeId));

    if (!opts?.keepProgrammeInResetStatus) {
      await updateProgrammeStatus(session.programmeId);
    }

    return {
      success: true,
      message: `Reporting reopened for ${session.programmeName}. Previous attendance, codes, and marks were cleared.`,
      reportingSessionId: session.id,
      programmeId: session.programmeId,
    };
  },

  async listByFestival(festivalId: string, session: AccessSession) {
    const accessibleStageIds =
      await StageAssignmentService.getAccessibleStageIds(festivalId, session);

    const programmes = await db.query.programme.findMany({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        exists(
          db
            .select({ one: sql`1` })
            .from(assignmentTable)
            .where(eq(assignmentTable.programmeId, programmeTable.id)),
        ),
      ),
      with: {
        category: { columns: { id: true, name: true } },
        programmeReportingSessions: {
          orderBy: [desc(prsTable.updatedAt)],
          limit: 1,
          with: {
            stage: { columns: { id: true, name: true } },
            scheduleEntry: {
              columns: {
                id: true,
                startTime: true,
                stageId: true,
              },
              with: { stage: { columns: { id: true, name: true } } },
            },
            programmeReportedParticipants: true,
            programmeCodeLetters: {
              orderBy: [asc(codeLetterTable.queuePosition)],
              with: {
                programmeCodeLetterRecipients: {
                  columns: { participantId: true },
                },
              },
            },
          },
        },
        scheduleEntries: {
          where: eq(scheduleEntryTable.type, "PROGRAMME"),
          orderBy: [desc(scheduleEntryTable.startTime)],
          limit: 1,
          columns: { id: true, startTime: true, stageId: true },
          with: { stage: { columns: { id: true, name: true } } },
        },
      },
    });

    const items = programmes
      .map((programme) => {
        const reportingSession =
          programme.programmeReportingSessions?.[0] ?? null;
        const latestEntry = programme.scheduleEntries?.[0] ?? null;
        const sessionStartTime = reportingSession?.scheduleEntry?.startTime;
        const entryStartTime = latestEntry?.startTime;
        const rawStart = sessionStartTime ?? entryStartTime ?? null;
        const startTime = rawStart ? parseInstant(rawStart) : null;
        const sessionStage = reportingSession?.stage
          ? { id: reportingSession.stage.id, name: reportingSession.stage.name }
          : null;
        const entryStage = latestEntry?.stage
          ? { id: latestEntry.stage.id, name: latestEntry.stage.name }
          : null;
        const stage = sessionStage ?? entryStage;

        const scheduleEntry = reportingSession?.scheduleEntry
          ? {
              id: reportingSession.scheduleEntry.id,
              startTime: reportingSession.scheduleEntry.startTime,
              stageId: reportingSession.scheduleEntry.stageId,
            }
          : latestEntry
            ? {
                id: latestEntry.id,
                startTime: latestEntry.startTime,
                stageId: latestEntry.stageId,
              }
            : null;

        const sessionPayload = reportingSession
          ? {
              id: reportingSession.id,
              status: reportingSession.status,
              startedAt: reportingSession.startedAt
                ? parseInstant(reportingSession.startedAt)
                : null,
              endedAt: reportingSession.endedAt,
              updatedAt: reportingSession.updatedAt,
              windowEndsAt: parseInstant(reportingSession.windowEndsAt),
              isLocked: reportingSession.isLocked,
              checkoutCompletedAt: reportingSession.checkoutCompletedAt,
              programmeReportedParticipants:
                reportingSession.programmeReportedParticipants ?? [],
              // The code under an unscratched tile is withheld even from the
              // stage manager's own payload — otherwise the draw is readable in
              // devtools before anyone has scratched.
              programmeCodeLetters:
                reportingSession.programmeCodeLetters?.map((cl) => ({
                  id: cl.id,
                  code: cl.revealedAt ? cl.code : "",
                  issuedAt: cl.issuedAt,
                  queuePosition: cl.queuePosition,
                  revealedAt: cl.revealedAt,
                  revealedBy: cl.revealedBy,
                  programmeCodeLetterRecipients:
                    cl.programmeCodeLetterRecipients ?? [],
                })) ?? [],
            }
          : null;

        return {
          id: programme.id,
          startTime,
          stage,
          programme: {
            id: programme.id,
            name: programme.name,
            type: programme.type,
            status: programme.status,
            durationMode: programme.durationMode,
            timePerUnitMinutes: programme.timePerUnitMinutes,
            parallelDurationMinutes: programme.parallelDurationMinutes,
            category: programme.category
              ? { id: programme.category.id, name: programme.category.name }
              : null,
          },
          scheduleEntry,
          reportingSession: sessionPayload,
        };
      })
      .filter((item) => item.reportingSession?.status !== "COMPLETED");

    if (accessibleStageIds === "all") {
      return items.sort((a, b) => {
        const aTime = a.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
        const bTime = b.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
    }

    return items
      .filter((item) => {
        if (!item.stage?.id) return true;
        return accessibleStageIds.includes(item.stage.id);
      })
      .sort((a, b) => {
        const aTime = a.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
        const bTime = b.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
  },

  getOrCreateSessionByProgramme,

  async startByProgramme(
    programmeId: string,
    festivalId: string,
    actorName: string,
  ) {
    const session = await ReportingSessionRepository.loadByProgramme(
      programmeId,
      festivalId,
    );

    session.start(actorName);
    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);

    await db
      .update(programmeTable)
      .set({
        status: "REPORTING",
        updatedAt: serverNowIso(),
      })
      .where(eq(programmeTable.id, session.programmeId));

    return {
      id: session.id,
      festivalId: session.festivalId,
      programmeId: session.programmeId,
      stageId: session.stageId,
      scheduleEntryId: session.scheduleEntryId,
      status: session.status,
      startedAt: session.startedAt,
      startedBy: session.startedBy,
      endedAt: session.endedAt,
      endedBy: session.endedBy,
      isLocked: session.isLocked,
      windowEndsAt: null,
      updatedAt: serverNowIso(),
    };
  },

  async reset(reportingSessionId: string, actorName: string) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);
    session.reset(actorName);
    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);

    await db
      .update(programmeTable)
      .set({
        status: "CANCELLED",
        updatedAt: serverNowIso(),
      })
      .where(eq(programmeTable.id, session.programmeId));

    return {
      success: true,
      message: `Reporting reset successfully. All ${session.programmeType === "GROUP" ? "team" : "participant"} data cleared.`,
    };
  },

  async markParticipant(
    reportingSessionId: string,
    assignmentId: string,
    isReported: boolean,
    actorName: string,
  ) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);

    const assignment = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, assignmentId),
      columns: {
        id: true,
        programmeId: true,
        participantId: true,
        groupId: true,
        teamNumber: true,
      },
    });
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.programmeId !== session.programmeId) {
      throw new Error(
        "Assignment does not belong to this programme reporting session",
      );
    }

    await assertAssignmentCategoryCompatibility({
      programmeId: session.programmeId,
      participantId: assignment.participantId,
    });

    const members = await db.query.programmeAssignmentMember.findMany({
      where: eq(assignmentMemberTable.assignmentId, assignmentId),
      columns: {
        id: true,
        assignmentId: true,
        participantId: true,
      },
    });

    for (const m of members) {
      await assertAssignmentCategoryCompatibility({
        programmeId: session.programmeId,
        participantId: m.participantId,
      });
    }

    const assignmentForAggregate = {
      id: assignment.id,
      programmeId: assignment.programmeId,
      participantId: assignment.participantId,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
    };

    if (isReported) {
      session.markParticipant(assignmentForAggregate, members, actorName);
    } else {
      session.unmarkParticipant(assignmentForAggregate, members, actorName);
    }

    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);
  },

  async markParticipantsBulk(
    reportingSessionId: string,
    assignmentIds: string[],
    isReported: boolean,
    actorName: string,
  ) {
    if (assignmentIds.length === 0) return;

    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);

    const assignments = await db.query.programmeAssignment.findMany({
      where: inArray(assignmentTable.id, assignmentIds),
      columns: {
        id: true,
        programmeId: true,
        participantId: true,
        groupId: true,
        teamNumber: true,
      },
    });
    if (assignments.length !== assignmentIds.length) {
      throw new Error("One or more assignments not found");
    }

    const isGroupProgramme = session.programmeType === "GROUP";
    const items: Array<{
      assignment: {
        id: string;
        programmeId: string;
        participantId: string | null;
        groupId: string | null;
        teamNumber: number | null;
      };
      members: Array<{
        id: string;
        assignmentId: string;
        participantId: string;
      }>;
    }> = [];

    if (isGroupProgramme) {
      for (const assignment of assignments) {
        const members = await db
          .select({
            id: assignmentMemberTable.id,
            assignmentId: assignmentMemberTable.assignmentId,
            participantId: assignmentMemberTable.participantId,
          })
          .from(assignmentMemberTable)
          .where(eq(assignmentMemberTable.assignmentId, assignment.id));
        for (const m of members) {
          await assertAssignmentCategoryCompatibility({
            programmeId: session.programmeId,
            participantId: m.participantId,
          });
        }
        items.push({
          assignment: {
            id: assignment.id,
            programmeId: assignment.programmeId,
            participantId: assignment.participantId,
            groupId: assignment.groupId,
            teamNumber: assignment.teamNumber,
          },
          members,
        });
      }
    } else {
      for (const assignment of assignments) {
        await assertAssignmentCategoryCompatibility({
          programmeId: session.programmeId,
          participantId: assignment.participantId,
        });
        items.push({
          assignment: {
            id: assignment.id,
            programmeId: assignment.programmeId,
            participantId: assignment.participantId,
            groupId: assignment.groupId,
            teamNumber: assignment.teamNumber,
          },
          members: [],
        });
      }
    }

    session.markParticipantsBulk(items, isReported, actorName);

    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);
  },

  async close(reportingSessionId: string, actorName: string) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);

    const dbSession = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        scheduleEntry: { columns: { startTime: true, endTime: true } },
      },
    });

    const effectiveEndedAt =
      dbSession?.scheduleEntry?.startTime || serverNowIso();

    const startMs = dbSession?.scheduleEntry?.startTime
      ? (parseInstant(dbSession.scheduleEntry.startTime)?.getTime() ?? null)
      : null;
    const endMs = dbSession?.scheduleEntry?.endTime
      ? (parseInstant(dbSession.scheduleEntry.endTime)?.getTime() ?? null)
      : null;
    const windowEndsAt = computeWindowEndsAt(startMs, endMs, Date.now());

    session.close(actorName, effectiveEndedAt, windowEndsAt);
    const events = await ReportingSessionRepository.save(session);
    const { participantCodes } = await ReportingEventAdapter.dispatch(events);

    await db
      .update(programmeTable)
      .set({
        status: "PENDING_JUDGMENT",
        updatedAt: serverNowIso(),
      })
      .where(eq(programmeTable.id, session.programmeId));

    return { participantCodes };
  },

  async complete(reportingSessionId: string, actorName: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      columns: { status: true },
    });
    if (!session || session.status !== "CLOSED") {
      throw new Error("Only closed sessions can be completed.");
    }

    await db
      .update(prsTable)
      .set({
        status: "COMPLETED",
        updatedAt: serverNowIso(),
      })
      .where(eq(prsTable.id, reportingSessionId));
  },

  async unlockByScheduleEntryChange(scheduleEntryId: string) {
    const dbSession = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.scheduleEntryId, scheduleEntryId),
      columns: { id: true, programmeId: true, status: true, isLocked: true },
    });
    if (!dbSession) return;

    if (dbSession.status === "CLOSED" && dbSession.isLocked) {
      await this.reopenClosedSession(dbSession.id, "Schedule update", {
        keepProgrammeInResetStatus: false,
      });
      return;
    }

    const session = await ReportingSessionRepository.loadById(dbSession.id);
    session.unlockForScheduleChange();
    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);

    await db.transaction(async (tx) => {
      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, session.programmeId));
    });
  },

  async getReportingStats(reportingSessionId: string) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);

    const assignments = await db.query.programmeAssignment.findMany({
      where: eq(assignmentTable.programmeId, session.programmeId),
      columns: {
        id: true,
        groupId: true,
        teamNumber: true,
      },
    });

    const isGroupProgramme = session.programmeType === "GROUP";

    const totalUnits = isGroupProgramme
      ? new Set(
          assignments.map((row) =>
            teamKey.partial({
              groupId: row.groupId,
              teamNumber: row.teamNumber,
            }),
          ),
        ).size
      : assignments.length;

    const reportedCount = isGroupProgramme
      ? new Set(
          session.reportedParticipants.map((row) =>
            teamKey.partial({
              groupId: row.groupId,
              teamNumber: row.teamNumber,
            }),
          ),
        ).size
      : session.reportedParticipants.length;

    const remaining = totalUnits - reportedCount;
    const startTime = session.startedAt
      ? parseInstant(session.startedAt)
      : null;

    let estimatedEnd: Date | null = null;
    let estimatedRemainingMinutes: number | null = null;

    if (startTime && reportedCount > 0 && remaining > 0) {
      const elapsed = serverNowMs() - startTime.getTime();
      const rate = elapsed / reportedCount;
      const remainingMs = rate * remaining;
      estimatedRemainingMinutes = Math.ceil(remainingMs / MS.minute);
      estimatedEnd = nowPlus(remainingMs);
    }

    return {
      total: totalUnits,
      reported: reportedCount,
      remaining,
      percentageComplete:
        totalUnits > 0 ? Math.round((reportedCount / totalUnits) * 100) : 0,
      startedAt: startTime,
      elapsedMinutes: startTime
        ? Math.round((serverNowMs() - startTime.getTime()) / MS.minute)
        : 0,
      estimatedEnd,
      estimatedRemainingMinutes,
    };
  },

  /**
   * Ends checkout (step 1) and opens scratching (step 2).
   *
   * The shuffle happens here, once, server-side: every checked-out unit is
   * dealt a code letter and a queue position in the same breath. Nothing is
   * revealed yet — the tiles exist, all unscratched.
   */
  async completeCheckout(reportingSessionId: string, actorName: string) {
    const session =
      await ReportingSessionRepository.loadById(reportingSessionId);

    const units = groupIntoUnits(
      session.reportedParticipants.map((p) => ({
        participantId: p.participantId,
        groupId: p.groupId,
        teamNumber: p.teamNumber,
        assignmentMemberId: p.assignmentMemberId,
        reportedAt: p.reportedAt,
      })),
      session.programmeType,
    );

    const assignments = planScratchCodes(units, shuffleInPlace);

    session.completeCheckout(actorName, assignments);
    const events = await ReportingSessionRepository.save(session);
    await ReportingEventAdapter.dispatch(events);

    return { success: true, tileCount: assignments.length };
  },

  /**
   * Scratches one tile. Idempotent: re-revealing an already-scratched tile
   * returns the same code rather than failing, so a double-tap or a retried
   * request can't look like an error to the participant standing at the desk.
   */
  async revealScratchCode(
    reportingSessionId: string,
    codeLetterId: string,
    actorName: string,
  ) {
    const nowStr = serverNowIso();

    return db.transaction(async (tx) => {
      const tile = await tx.query.programmeCodeLetter.findFirst({
        where: and(
          eq(codeLetterTable.id, codeLetterId),
          eq(codeLetterTable.reportingSessionId, reportingSessionId),
        ),
        columns: {
          id: true,
          code: true,
          queuePosition: true,
          revealedAt: true,
          revealedBy: true,
        },
      });
      if (!tile) throw new Error("Code letter not found for this session");

      if (tile.revealedAt) {
        return {
          success: true,
          code: tile.code,
          queuePosition: tile.queuePosition,
          alreadyRevealed: true,
        };
      }

      await tx
        .update(codeLetterTable)
        .set({ revealedAt: nowStr, revealedBy: actorName })
        .where(eq(codeLetterTable.id, codeLetterId));

      return {
        success: true,
        code: tile.code,
        queuePosition: tile.queuePosition,
        alreadyRevealed: false,
      };
    });
  },

  /**
   * Reveals every tile still unscratched — the escape hatch for when the queue
   * stalls (participant left, tile skipped) and the stage manager needs to
   * finish. Reveal is the act of reporting, so these units count as reported.
   */
  async revealAllRemaining(reportingSessionId: string, actorName: string) {
    const nowStr = serverNowIso();

    const revealed = await db
      .update(codeLetterTable)
      .set({ revealedAt: nowStr, revealedBy: actorName })
      .where(
        and(
          eq(codeLetterTable.reportingSessionId, reportingSessionId),
          sql`${codeLetterTable.revealedAt} is null`,
        ),
      )
      .returning({ id: codeLetterTable.id, code: codeLetterTable.code });

    return { success: true, revealedCount: revealed.length };
  },
};
