import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  category as categoryTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
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
import { NotificationService } from "@/features/notifications/services/notification.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import { CodeLetterGeneratorService } from "./code-letter-generator.service";

async function getOrCreateSessionByScheduleEntry(scheduleEntryId: string) {
  const existing = await db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.scheduleEntryId, scheduleEntryId),
    with: {
      scheduleEntry: {
        with: { programme: true, stage: true },
      },
    },
  });
  if (existing) return existing;

  const entry = await db.query.scheduleEntry.findFirst({
    where: eq(scheduleEntryTable.id, scheduleEntryId),
    with: { programme: true, stage: true },
  });
  if (!entry || !entry.programmeId || !entry.programme) {
    throw new Error("Scheduled programme entry not found");
  }

  const newId = randomUUID();
  await db.insert(prsTable).values({
    id: newId,
    festivalId: entry.festivalId,
    scheduleEntryId: entry.id,
    programmeId: entry.programmeId,
    stageId: entry.stageId,
    status: "NOT_STARTED",
    updatedAt: serverNowIso(),
  } as any);

  return db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, newId),
    with: {
      scheduleEntry: { with: { programme: true, stage: true } },
    },
  });
}

async function getAssignedRecipientsForSession(reportingSessionId: string) {
  const session = await db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, reportingSessionId),
    columns: { festivalId: true, programmeId: true },
  });
  if (!session) return null;
  return session;
}

async function assertAssignmentCategoryCompatibility(input: {
  programmeId: string;
  participantId: string | null;
}) {
  if (!input.participantId) return;

  // Assignment is validated at create time; allow reporting even if the
  // participant's category was changed later.
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
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true, name: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (!session.isLocked || session.status !== "CLOSED") {
      throw new Error(
        "Only closed reporting sessions can be reopened destructively.",
      );
    }

    const nowStr = serverNowIso();

    await db.transaction(async (tx) => {
      await CodeLetterGeneratorService.clearSessionCodeLetters(session.id);
      await tx
        .delete(reportedParticipantTable)
        .where(eq(reportedParticipantTable.reportingSessionId, session.id));

      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, session.programmeId));

      await tx
        .update(prsTable)
        .set({
          status: "RESET",
          isLocked: false,
          startedAt: null,
          startedBy: null,
          endedAt: nowStr,
          endedBy: actorName,
          windowEndsAt: null,
          updatedAt: nowStr,
        })
        .where(eq(prsTable.id, session.id));

      await tx
        .update(programmeTable)
        .set({
          status: opts?.keepProgrammeInResetStatus ? "RESET" : "SCHEDULED",
          publishedAt: null,
          updatedAt: nowStr,
        })
        .where(eq(programmeTable.id, session.programmeId));
    });

    if (!opts?.keepProgrammeInResetStatus) {
      await updateProgrammeStatus(session.programmeId);
    }

    await NotificationService.dispatch({
      eventType: "PROGRAMME_STATUS_CHANGED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Reporting reopened",
        body: "Reporting was reopened. Previous code letters and submitted marks were cleared.",
        payload: {
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          status: "SCHEDULED",
        },
      },
      channels: ["IN_APP"],
    });

    await NotificationService.dispatch({
      eventType: "REPORTING_RESET",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Reporting reopened",
        body: "Previous reporting codes are no longer valid. Reporting will restart with new attendance and code letters.",
        payload: {
          reportingSessionId: session.id,
          programmeId: session.programmeId,
        },
      },
      channels: ["IN_APP", "EMAIL"],
    });

    return {
      success: true,
      message: `Reporting reopened for ${session.programme.name}. Previous attendance, codes, and marks were cleared.`,
      reportingSessionId: session.id,
      programmeId: session.programmeId,
    };
  },

  async listByFestival(festivalId: string) {
    const entries = await db.query.scheduleEntry.findMany({
      where: and(
        eq(scheduleEntryTable.festivalId, festivalId),
        eq(scheduleEntryTable.type, "PROGRAMME"),
      ),
      with: {
        programme: {
          with: {
            category: true,
          },
        },
        stage: true,
        programmeReportingSessions: {
          with: {
            programmeReportedParticipants: true,
            programmeCodeLetters: {
              orderBy: [asc(codeLetterTable.issuedAt)],
              with: {
                programmeCodeLetterRecipients: {
                  columns: { participantId: true },
                },
              },
            },
          },
        },
      },
      orderBy: [
        asc(scheduleEntryTable.startTime),
        asc(scheduleEntryTable.order),
      ],
    });

    return entries.map((entry) => ({
      ...entry,
      reportingSession: entry.programmeReportingSessions?.[0] ?? null,
    }));
  },

  async start(scheduleEntryId: string, actorName: string) {
    const session = await getOrCreateSessionByScheduleEntry(scheduleEntryId);
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked)
      throw new Error("Reporting is locked for this programme");
    if (session.status === "CLOSED")
      throw new Error("Reporting already closed");

    const now = serverNowIso();
    const windowEndsAt = null;

    const updated = await db
      .update(prsTable)
      .set({
        status: "IN_PROGRESS",
        startedAt: now,
        startedBy: actorName,
        endedAt: null,
        endedBy: null,
        windowEndsAt,
        updatedAt: now,
      })
      .where(eq(prsTable.id, session.id))
      .returning();

    const targets = await getAssignedRecipientsForSession(session.id);
    if (targets) {
      await NotificationService.dispatch({
        eventType: "REPORTING_STARTED",
        festivalId: targets.festivalId,
        targets: {
          programmeId: targets.programmeId,
          includeTeamLeadersForProgramme: true,
        },
        context: {
          title: "Programme reporting started",
          body: "Stage reporting has started. Please report to the stage manager.",
          payload: {
            reportingSessionId: session.id,
            programmeId: targets.programmeId,
          },
        },
        channels: ["IN_APP", "EMAIL"],
      });
    }

    await db
      .update(programmeTable)
      .set({
        status: "REPORTING",
        updatedAt: now,
      })
      .where(eq(programmeTable.id, session.programmeId));

    await NotificationService.dispatch({
      eventType: "REPORTING_STARTED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Programme reporting started",
        body: "Stage reporting has started. Please report to the stage manager.",
        payload: {
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          status: "REPORTING",
        },
      },
      channels: ["IN_APP", "EMAIL"],
    });

    return updated[0];
  },

  async reset(reportingSessionId: string, actorName: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");

    const now = serverNowIso();

    await db.transaction(async (tx) => {
      await CodeLetterGeneratorService.clearSessionCodeLetters(
        reportingSessionId,
      );

      await tx
        .delete(reportedParticipantTable)
        .where(
          eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
        );

      await tx
        .update(prsTable)
        .set({
          status: "RESET",
          startedAt: null,
          startedBy: null,
          endedAt: now,
          endedBy: actorName,
          windowEndsAt: null,
          updatedAt: now,
        })
        .where(eq(prsTable.id, reportingSessionId));

      await tx
        .update(programmeTable)
        .set({
          status: "RESET",
          updatedAt: now,
        })
        .where(eq(programmeTable.id, session.programmeId));
    });

    await NotificationService.dispatch({
      eventType: "PROGRAMME_STATUS_CHANGED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Programme reset",
        body: `Programme has been reset. All reporting data cleared. Status: RESET`,
        payload: { programmeId: session.programmeId, status: "RESET" },
      },
      channels: ["IN_APP"],
    });

    await NotificationService.dispatch({
      eventType: "REPORTING_RESET",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Reporting reset",
        body: "All reporting data has been cleared. You can start fresh.",
        payload: { reportingSessionId, programmeId: session.programmeId },
      },
      channels: ["IN_APP", "EMAIL"],
    });

    return {
      success: true,
      message: `Reporting reset successfully. All ${session.programme.type === "GROUP" ? "team" : "participant"} data cleared.`,
    };
  },

  async markParticipant(
    reportingSessionId: string,
    assignmentId: string,
    isReported: boolean,
    actorName: string,
  ) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Reporting must be in progress to mark participants");
    }

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

    const now = serverNowIso();

    if (isReported) {
      if (
        session.programme.type === "GROUP" &&
        assignment.groupId &&
        assignment.teamNumber
      ) {
        const existingTeamReport =
          await db.query.programmeReportedParticipant.findFirst({
            where: and(
              eq(
                reportedParticipantTable.reportingSessionId,
                reportingSessionId,
              ),
              eq(reportedParticipantTable.groupId, assignment.groupId),
              eq(reportedParticipantTable.teamNumber, assignment.teamNumber),
            ),
          });

        if (existingTeamReport) {
          throw new Error(
            `Team ${assignment.teamNumber} has already been reported`,
          );
        }

        const teamAssignments = await db.query.programmeAssignment.findMany({
          where: and(
            eq(assignmentTable.programmeId, session.programmeId),
            eq(assignmentTable.groupId, assignment.groupId),
            eq(assignmentTable.teamNumber, assignment.teamNumber),
          ),
          columns: { id: true, participantId: true },
        });
        for (const ta of teamAssignments) {
          await assertAssignmentCategoryCompatibility({
            programmeId: session.programmeId,
            participantId: ta.participantId,
          });
        }

        await db.transaction(async (tx) => {
          for (const ta of teamAssignments) {
            await tx
              .insert(reportedParticipantTable)
              .values({
                id: randomUUID(),
                reportingSessionId,
                assignmentId: ta.id,
                participantId: ta.participantId,
                groupId: assignment.groupId,
                teamNumber: assignment.teamNumber,
                reportedBy: actorName,
                reportedAt: now,
              } as any)
              .onConflictDoUpdate({
                target: [
                  reportedParticipantTable.reportingSessionId,
                  reportedParticipantTable.assignmentId,
                ],
                set: {
                  reportedAt: now,
                  reportedBy: actorName,
                },
              });
          }
        });

        const teamParticipantIds = teamAssignments
          .map((a) => a.participantId)
          .filter((id): id is string => id !== null);

        if (teamParticipantIds.length > 0) {
          await NotificationService.dispatch({
            eventType: "REPORTING_PARTICIPANT_MARKED",
            festivalId: session.festivalId,
            targets: { participantIds: teamParticipantIds },
            context: {
              title: "Team reporting confirmed",
              body: `Your team (Team ${assignment.teamNumber}) has been marked as reported.`,
              payload: {
                reportingSessionId,
                teamNumber: assignment.teamNumber,
                isReported: true,
              },
            },
            channels: ["IN_APP"],
          });
        }
      } else {
        await db
          .insert(reportedParticipantTable)
          .values({
            id: randomUUID(),
            reportingSessionId,
            assignmentId,
            participantId: assignment.participantId,
            groupId: assignment.groupId,
            teamNumber: assignment.teamNumber,
            reportedBy: actorName,
            reportedAt: now,
          } as any)
          .onConflictDoUpdate({
            target: [
              reportedParticipantTable.reportingSessionId,
              reportedParticipantTable.assignmentId,
            ],
            set: {
              reportedAt: now,
              reportedBy: actorName,
            },
          });

        if (assignment.participantId) {
          await NotificationService.dispatch({
            eventType: "REPORTING_PARTICIPANT_MARKED",
            festivalId: session.festivalId,
            targets: { participantIds: [assignment.participantId] },
            context: {
              title: "Reporting attendance updated",
              body: "You have been marked as reported by stage manager.",
              payload: { reportingSessionId, assignmentId, isReported: true },
            },
            channels: ["IN_APP"],
          });
        }
      }
    } else {
      await db
        .delete(reportedParticipantTable)
        .where(
          and(
            eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
            eq(reportedParticipantTable.assignmentId, assignmentId),
          ),
        );

      if (assignment.participantId) {
        await NotificationService.dispatch({
          eventType: "REPORTING_PARTICIPANT_MARKED",
          festivalId: session.festivalId,
          targets: { participantIds: [assignment.participantId] },
          context: {
            title: "Reporting attendance updated",
            body: "Your reporting mark was removed by stage manager.",
            payload: { reportingSessionId, assignmentId, isReported: false },
          },
          channels: ["IN_APP"],
        });
      }
    }
  },

  async markParticipantsBulk(
    reportingSessionId: string,
    assignmentIds: string[],
    isReported: boolean,
    actorName: string,
  ) {
    if (assignmentIds.length === 0) return;

    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Reporting must be in progress to mark participants");
    }

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
    for (const assignment of assignments) {
      await assertAssignmentCategoryCompatibility({
        programmeId: session.programmeId,
        participantId: assignment.participantId,
      });
    }

    const now = serverNowIso();

    await db.transaction(async (tx) => {
      for (const assignment of assignments) {
        if (isReported) {
          await tx
            .insert(reportedParticipantTable)
            .values({
              id: randomUUID(),
              reportingSessionId,
              assignmentId: assignment.id,
              participantId: assignment.participantId,
              groupId: assignment.groupId,
              teamNumber: assignment.teamNumber,
              reportedBy: actorName,
              reportedAt: now,
            } as any)
            .onConflictDoUpdate({
              target: [
                reportedParticipantTable.reportingSessionId,
                reportedParticipantTable.assignmentId,
              ],
              set: {
                reportedAt: now,
                reportedBy: actorName,
              },
            });
        } else {
          await tx
            .delete(reportedParticipantTable)
            .where(
              and(
                eq(
                  reportedParticipantTable.reportingSessionId,
                  reportingSessionId,
                ),
                eq(reportedParticipantTable.assignmentId, assignment.id),
              ),
            );
        }
      }
    });

    const participantIds = assignments
      .map((a) => a.participantId)
      .filter((id): id is string => id !== null);

    if (participantIds.length > 0) {
      await NotificationService.dispatch({
        eventType: "REPORTING_PARTICIPANT_MARKED",
        festivalId: session.festivalId,
        targets: { participantIds },
        context: {
          title: "Reporting attendance updated",
          body: isReported
            ? "You have been marked as reported by stage manager."
            : "Your reporting mark was removed by stage manager.",
          payload: {
            reportingSessionId,
            isReported,
          },
        },
        channels: ["IN_APP"],
      });
    }
  },

  async close(reportingSessionId: string, actorName: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
        scheduleEntry: { columns: { startTime: true } },
        programmeReportedParticipants: true,
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is already locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }

    const reportedWithParticipant =
      session.programmeReportedParticipants.filter(
        (p): p is typeof p & { participantId: string } =>
          Boolean(p.participantId),
      );
    if (reportedWithParticipant.length > 0) {
      const letters = await db.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
        with: { programmeCodeLetterRecipients: true },
      });
      const participantIdsWithCode = new Set<string>();
      for (const letter of letters) {
        for (const r of letter.programmeCodeLetterRecipients) {
          participantIdsWithCode.add(r.participantId);
        }
      }
      for (const p of reportedWithParticipant) {
        if (!participantIdsWithCode.has(p.participantId)) {
          throw new Error(
            "Assign a code letter to every reported participant (spin for each present row) before submitting.",
          );
        }
      }
    }

    const effectiveEndedAt = session.scheduleEntry?.startTime || serverNowIso();

    const closed = await db.transaction(async (tx) => {
      const nowStr = serverNowIso();
      await tx
        .update(prsTable)
        .set({
          status: "CLOSED",
          endedAt: effectiveEndedAt,
          endedBy: actorName,
          isLocked: true,
          windowEndsAt: null,
          updatedAt: nowStr,
        })
        .where(eq(prsTable.id, reportingSessionId));

      const isGroupProgramme = session.programme.type === "GROUP";

      const participantCodes = isGroupProgramme
        ? await CodeLetterGeneratorService.generateForGroupSession(
            {
              id: session.id,
              festivalId: session.festivalId,
              programmeId: session.programmeId,
            },
            session.programmeReportedParticipants,
            actorName,
            tx,
          )
        : await CodeLetterGeneratorService.generateForIndividualSession(
            {
              id: session.id,
              festivalId: session.festivalId,
              programmeId: session.programmeId,
            },
            session.programmeReportedParticipants,
            actorName,
            tx,
          );

      await tx
        .update(programmeTable)
        .set({
          status: "STARTED",
          updatedAt: nowStr,
        })
        .where(eq(programmeTable.id, session.programmeId));

      return { participantCodes };
    });

    await NotificationService.dispatch({
      eventType: "REPORTING_CLOSED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Reporting ended",
        body:
          session.programme.type === "GROUP"
            ? "Reporting has ended. Each reported team shares one team code (A, B, C…)."
            : "Reporting has ended. Reported participants received individual code letters.",
        payload: {
          reportingSessionId,
          programmeId: session.programmeId,
        },
      },
      channels: ["IN_APP", "EMAIL"],
    });

    await NotificationService.dispatch({
      eventType: "PROGRAMME_STATUS_CHANGED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Programme status updated",
        body: "Programme is ready for judgement (Started).",
        payload: {
          reportingSessionId,
          programmeId: session.programmeId,
          status: "STARTED",
        },
      },
      channels: ["IN_APP"],
    });

    const isGroup = session.programme.type === "GROUP";
    const issuedLetters = await db.query.programmeCodeLetter.findMany({
      where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
      with: { programmeCodeLetterRecipients: true },
    });
    const notifyByParticipant = new Map<string, string>();
    for (const letter of issuedLetters) {
      for (const r of letter.programmeCodeLetterRecipients) {
        notifyByParticipant.set(r.participantId, letter.code);
      }
    }
    for (const [participantId, code] of notifyByParticipant) {
      await NotificationService.dispatch({
        eventType: "CODE_LETTER_ISSUED",
        festivalId: session.festivalId,
        targets: { participantIds: [participantId] },
        context: {
          title: isGroup ? "Team code issued" : "Code letter issued",
          body: isGroup
            ? `Your team’s code is ${code}.`
            : `Your programme reporting code letter is ${code}.`,
          payload: {
            reportingSessionId,
            programmeId: session.programmeId,
            codeLetter: code,
          },
        },
        channels: ["IN_APP", "EMAIL"],
      });
    }

    return closed;
  },

  async unlockByScheduleEntryChange(scheduleEntryId: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.scheduleEntryId, scheduleEntryId),
      columns: { id: true, programmeId: true, status: true, isLocked: true },
    });
    if (!session) return;

    if (session.status === "CLOSED" && session.isLocked) {
      await this.reopenClosedSession(session.id, "Schedule update", {
        keepProgrammeInResetStatus: false,
      });
      return;
    }

    await db.transaction(async (tx) => {
      await CodeLetterGeneratorService.clearSessionCodeLetters(session.id);
      await tx
        .delete(reportedParticipantTable)
        .where(eq(reportedParticipantTable.reportingSessionId, session.id));

      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, session.programmeId));

      await tx
        .update(prsTable)
        .set({
          isLocked: false,
          status: "RESET",
          updatedAt: serverNowIso(),
        })
        .where(eq(prsTable.id, session.id));
    });
  },

  async getReportingStats(reportingSessionId: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: true,
        programmeReportedParticipants: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");

    const assignments = await db.query.programmeAssignment.findMany({
      where: eq(assignmentTable.programmeId, session.programmeId),
      columns: {
        id: true,
        groupId: true,
        teamNumber: true,
      },
    });

    const totalUnits =
      session.programme.type === "GROUP"
        ? new Set(
            assignments.map(
              (row) => `${row.groupId ?? "no-group"}::${row.teamNumber ?? 0}`,
            ),
          ).size
        : assignments.length;

    const reportedCount =
      session.programme.type === "GROUP"
        ? new Set(
            session.programmeReportedParticipants.map(
              (row) => `${row.groupId ?? "no-group"}::${row.teamNumber ?? 0}`,
            ),
          ).size
        : session.programmeReportedParticipants.length;

    const remaining = totalUnits - reportedCount;
    const startTime = parseInstant(session.startedAt);

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

  async assignCodesWithSpin(
    reportingSessionId: string,
    codeAssignments: Array<{
      teamNumber: number | null;
      groupId?: string | null;
      participantId?: string | null;
      code: string;
    }>,
    actorName: string,
  ) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
        programmeReportedParticipants: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is already locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }

    // Restriction removed to allow INDIVIDUAL programmes to use spin wheel

    const participantCodes =
      await CodeLetterGeneratorService.generateFromSpinWheel(
        {
          id: session.id,
          festivalId: session.festivalId,
          programmeId: session.programmeId,
        },
        codeAssignments,
        session.programmeReportedParticipants,
        actorName,
      );
    // Session remains IN_PROGRESS to allow more participants to report and spin
    // Session status and programme status will be updated via a separate close action

    for (const { participantId, code } of participantCodes) {
      await NotificationService.dispatch({
        eventType: "CODE_LETTER_ISSUED",
        festivalId: session.festivalId,
        targets: { participantIds: [participantId] },
        context: {
          title: "Code letter issued",
          body: `Your programme reporting code letter is ${code}.`,
          payload: {
            reportingSessionId,
            programmeId: session.programmeId,
            codeLetter: code,
          },
        },
        channels: ["IN_APP"],
      });
    }

    return {
      success: true,
      codesAssigned: codeAssignments.length,
      participantsNotified: participantCodes.length,
    };
  },

  async resetSpinCodeLetters(reportingSessionId: string, actorName: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      columns: {
        id: true,
        status: true,
        isLocked: true,
        programmeId: true,
        festivalId: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) {
      throw new Error(
        "Cannot reset code letters for a closed reporting session",
      );
    }
    if (session.status !== "IN_PROGRESS") {
      throw new Error(
        "Code letters can only be reset while reporting is in progress",
      );
    }

    await CodeLetterGeneratorService.clearSessionCodeLetters(
      reportingSessionId,
    );

    await NotificationService.dispatch({
      eventType: "REPORTING_RESET",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Code letters reset",
        body: "All issued code letters were cleared. Stage manager will re-spin and assign fresh letters.",
        payload: {
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          actionBy: actorName,
        },
      },
      channels: ["IN_APP"],
    });

    return { success: true };
  },
};
