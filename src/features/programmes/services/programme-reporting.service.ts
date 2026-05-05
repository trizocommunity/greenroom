import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  category as categoryTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  programmeJudgeSession as judgeSessionTable,
  programme as programmeTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  result as resultTable,
  scheduleEntry as scheduleEntryTable,
  stage as stageTable,
} from "@/core/database/schema";
import { CodeLetterGeneratorService } from "./code-letter-generator.service";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

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
    updatedAt: new Date().toISOString(),
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

export const ProgrammeReportingService = {
  async reopenLatestClosedSessionByProgramme(
    programmeId: string,
    actorName: string,
  ) {
    const latestClosedSession = await db.query.programmeReportingSession.findFirst({
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

    const nowStr = new Date().toISOString();

    await db.transaction(async (tx) => {
      await CodeLetterGeneratorService.clearSessionCodeLetters(session.id);
      await tx
        .delete(reportedParticipantTable)
        .where(eq(reportedParticipantTable.reportingSessionId, session.id));

      await tx
        .delete(resultTable)
        .where(eq(resultTable.programmeId, session.programmeId));

      await tx
        .update(judgeSessionTable)
        .set({
          usedAt: nowStr,
          endedAt: nowStr,
          updatedAt: nowStr,
        })
        .where(
          and(
            eq(judgeSessionTable.programmeId, session.programmeId),
            isNull(judgeSessionTable.usedAt),
          ),
        );

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
        payload: { reportingSessionId: session.id, programmeId: session.programmeId },
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
                programmeCodeLetterRecipients: { columns: { studentId: true } },
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

    const now = new Date().toISOString();
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

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      const codeLetters = await tx.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
        columns: { id: true },
      });

      if (codeLetters.length > 0) {
        const codeLetterIds = codeLetters.map((cl) => cl.id);
        await tx
          .delete(codeLetterRecipientTable)
          .where(inArray(codeLetterRecipientTable.codeLetterId, codeLetterIds));
      }

      await tx
        .delete(codeLetterTable)
        .where(eq(codeLetterTable.reportingSessionId, reportingSessionId));
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
      message: `Reporting reset successfully. All ${session.programme.type === "GROUP" ? "team" : "student"} data cleared.`,
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
        studentId: true,
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

    const now = new Date().toISOString();

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
          columns: { id: true, studentId: true },
        });

        await db.transaction(async (tx) => {
          for (const ta of teamAssignments) {
            await tx
              .insert(reportedParticipantTable)
              .values({
                id: randomUUID(),
                reportingSessionId,
                assignmentId: ta.id,
                studentId: ta.studentId,
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

        const teamStudentIds = teamAssignments
          .map((a) => a.studentId)
          .filter((id): id is string => id !== null);

        if (teamStudentIds.length > 0) {
          await NotificationService.dispatch({
            eventType: "REPORTING_PARTICIPANT_MARKED",
            festivalId: session.festivalId,
            targets: { studentIds: teamStudentIds },
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
            studentId: assignment.studentId,
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

        if (assignment.studentId) {
          await NotificationService.dispatch({
            eventType: "REPORTING_PARTICIPANT_MARKED",
            festivalId: session.festivalId,
            targets: { studentIds: [assignment.studentId] },
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

      if (assignment.studentId) {
        await NotificationService.dispatch({
          eventType: "REPORTING_PARTICIPANT_MARKED",
          festivalId: session.festivalId,
          targets: { studentIds: [assignment.studentId] },
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
        studentId: true,
        groupId: true,
        teamNumber: true,
      },
    });
    if (assignments.length !== assignmentIds.length) {
      throw new Error("One or more assignments not found");
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const assignment of assignments) {
        if (isReported) {
          await tx
            .insert(reportedParticipantTable)
            .values({
              id: randomUUID(),
              reportingSessionId,
              assignmentId: assignment.id,
              studentId: assignment.studentId,
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

    const studentIds = assignments
      .map((a) => a.studentId)
      .filter((id): id is string => id !== null);

    if (studentIds.length > 0) {
      await NotificationService.dispatch({
        eventType: "REPORTING_PARTICIPANT_MARKED",
        festivalId: session.festivalId,
        targets: { studentIds },
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

    const reportedWithStudent = session.programmeReportedParticipants.filter(
      (p): p is (typeof p & { studentId: string }) => Boolean(p.studentId),
    );
    if (reportedWithStudent.length > 0) {
      const letters = await db.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
        with: { programmeCodeLetterRecipients: true },
      });
      const studentIdsWithCode = new Set<string>();
      for (const letter of letters) {
        for (const r of letter.programmeCodeLetterRecipients) {
          studentIdsWithCode.add(r.studentId);
        }
      }
      for (const p of reportedWithStudent) {
        if (!studentIdsWithCode.has(p.studentId)) {
          throw new Error(
            "Assign a code letter to every reported participant (spin for each present row) before submitting.",
          );
        }
      }
    }

    const effectiveEndedAt =
      session.scheduleEntry?.startTime || new Date().toISOString();

    const closed = await db.transaction(async (tx) => {
      const nowStr = new Date().toISOString();
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

      const studentCodes = isGroupProgramme
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

      return { studentCodes };
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
            : "Reporting has ended. Reported students received individual code letters.",
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
        body: "Programme is ready for judgment (Started).",
        payload: {
          reportingSessionId,
          programmeId: session.programmeId,
          status: "STARTED",
        },
      },
      channels: ["IN_APP"],
    });

    const isGroup = session.programme.type === "GROUP";
    for (const { studentId, code } of closed.studentCodes) {
      await NotificationService.dispatch({
        eventType: "CODE_LETTER_ISSUED",
        festivalId: session.festivalId,
        targets: { studentIds: [studentId] },
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
        channels: ["IN_APP"],
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
          updatedAt: new Date().toISOString(),
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

    const [assignmentCountResult] = await db
      .select({ c: count() })
      .from(assignmentTable)
      .where(eq(assignmentTable.programmeId, session.programmeId));

    const totalParticipants = assignmentCountResult.c;
    const reportedCount = session.programmeReportedParticipants.length;
    const totalUnits = totalParticipants;

    const remaining = totalUnits - reportedCount;
    const startTime = session.startedAt ? new Date(session.startedAt) : null;

    let estimatedEnd: Date | null = null;
    let estimatedRemainingMinutes: number | null = null;

    if (startTime && reportedCount > 0 && remaining > 0) {
      const elapsed = Date.now() - startTime.getTime();
      const rate = elapsed / reportedCount;
      const remainingMs = rate * remaining;
      estimatedRemainingMinutes = Math.ceil(remainingMs / 60000);
      estimatedEnd = new Date(Date.now() + remainingMs);
    }

    return {
      total: totalUnits,
      reported: reportedCount,
      remaining,
      percentageComplete:
        totalUnits > 0 ? Math.round((reportedCount / totalUnits) * 100) : 0,
      startedAt: startTime,
      elapsedMinutes: startTime
        ? Math.round((Date.now() - startTime.getTime()) / 60000)
        : 0,
      estimatedEnd,
      estimatedRemainingMinutes,
    };
  },

  async assignCodesWithSpin(
    reportingSessionId: string,
    codeAssignments: Array<{
      teamNumber: number | null;
      studentId?: string | null;
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

    const studentCodes = await CodeLetterGeneratorService.generateFromSpinWheel(
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

    for (const { studentId, code } of studentCodes) {
      await NotificationService.dispatch({
        eventType: "CODE_LETTER_ISSUED",
        festivalId: session.festivalId,
        targets: { studentIds: [studentId] },
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
      studentsNotified: studentCodes.length,
    };
  },
};
