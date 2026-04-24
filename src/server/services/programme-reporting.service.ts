import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { 
  programmeReportingSession as prsTable, 
  scheduleEntry as scheduleEntryTable,
  programme as programmeTable,
  programmeCodeLetter as codeLetterTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeAssignment as assignmentTable,
  stage as stageTable,
  category as categoryTable
} from "@/server/db/schema";
import { eq, and, desc, inArray, count, asc, sql } from "drizzle-orm";
import { NotificationService } from "@/server/services/notification.service";

/** 1 → A, 2 → B, … 26 → Z, 27 → AA (same as spreadsheet column letters). */
function sequentialAlphabetCode(indexOneBased: number): string {
  let n = Math.max(1, indexOneBased);
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const t = arr[i];
    arr[i] = arr[j]!;
    arr[j] = t!;
  }
}

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
  });

  return db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, newId),
    with: {
      scheduleEntry: { include: { programme: true, stage: true } },
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
  async listByFestival(festivalId: string) {
    const entries = await db.query.scheduleEntry.findMany({
      where: and(
        eq(scheduleEntryTable.festivalId, festivalId),
        eq(scheduleEntryTable.type, "PROGRAMME")
      ),
      with: {
        programme: {
          with: {
            category: true,
          },
        },
        stage: true,
        reportingSessions: {
          with: {
            reportedParticipants: true,
            codeLetters: {
              orderBy: [asc(codeLetterTable.issuedAt)],
              with: {
                recipients: { columns: { studentId: true } },
              },
            },
          },
        },
      },
      orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
    });
    
    return entries.map((entry) => ({
      ...entry,
      reportingSession: entry.reportingSessions ?? null,
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

    const updated = await db.update(prsTable).set({
      status: "IN_PROGRESS",
      startedAt: now,
      startedBy: actorName,
      endedAt: null,
      endedBy: null,
      windowEndsAt,
      updatedAt: now,
    }).where(eq(prsTable.id, session.id)).returning();

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

    await db.update(programmeTable).set({ 
      status: "REPORTING",
      updatedAt: now,
    }).where(eq(programmeTable.id, session.programmeId));
    
    await NotificationService.dispatch({
      eventType: "PROGRAMME_STATUS_CHANGED",
      festivalId: session.festivalId,
      targets: {
        programmeId: session.programmeId,
        includeTeamLeadersForProgramme: true,
      },
      context: {
        title: "Programme status updated",
        body: "Programme is now in Reporting status.",
        payload: { programmeId: session.programmeId, status: "REPORTING" },
      },
        channels: ["IN_APP"],
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
        await tx.delete(codeLetterRecipientTable).where(inArray(codeLetterRecipientTable.codeLetterId, codeLetterIds));
      }

      await tx.delete(codeLetterTable).where(eq(codeLetterTable.reportingSessionId, reportingSessionId));
      await tx.delete(reportedParticipantTable).where(eq(reportedParticipantTable.reportingSessionId, reportingSessionId));

      await tx.update(prsTable).set({
        status: "RESET",
        startedAt: null,
        startedBy: null,
        endedAt: now,
        endedBy: actorName,
        windowEndsAt: null,
        updatedAt: now,
      }).where(eq(prsTable.id, reportingSessionId));

      await tx.update(programmeTable).set({ 
        status: "RESET",
        updatedAt: now,
      }).where(eq(programmeTable.id, session.programmeId));
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
        const existingTeamReport = await db.query.programmeReportedParticipant.findFirst({
          where: and(
            eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
            eq(reportedParticipantTable.groupId, assignment.groupId),
            eq(reportedParticipantTable.teamNumber, assignment.teamNumber)
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
            eq(assignmentTable.teamNumber, assignment.teamNumber)
          ),
          columns: { id: true, studentId: true },
        });

        await db.transaction(async (tx) => {
          for (const ta of teamAssignments) {
            await tx.insert(reportedParticipantTable).values({
              id: randomUUID(),
              reportingSessionId,
              assignmentId: ta.id,
              studentId: ta.studentId,
              groupId: assignment.groupId,
              teamNumber: assignment.teamNumber,
              reportedBy: actorName,
              reportedAt: now,
              updatedAt: now,
            }).onConflictDoUpdate({
              target: [reportedParticipantTable.reportingSessionId, reportedParticipantTable.assignmentId],
              set: {
                reportedAt: now,
                reportedBy: actorName,
                updatedAt: now,
              }
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
        await db.insert(reportedParticipantTable).values({
          id: randomUUID(),
          reportingSessionId,
          assignmentId,
          studentId: assignment.studentId,
          groupId: assignment.groupId,
          teamNumber: assignment.teamNumber,
          reportedBy: actorName,
          reportedAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [reportedParticipantTable.reportingSessionId, reportedParticipantTable.assignmentId],
          set: {
            reportedAt: now,
            reportedBy: actorName,
            updatedAt: now,
          }
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
      await db.delete(reportedParticipantTable).where(and(
        eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
        eq(reportedParticipantTable.assignmentId, assignmentId)
      ));
      
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
          await tx.insert(reportedParticipantTable).values({
            id: randomUUID(),
            reportingSessionId,
            assignmentId: assignment.id,
            studentId: assignment.studentId,
            groupId: assignment.groupId,
            teamNumber: assignment.teamNumber,
            reportedBy: actorName,
            reportedAt: now,
            updatedAt: now,
          }).onConflictDoUpdate({
            target: [reportedParticipantTable.reportingSessionId, reportedParticipantTable.assignmentId],
            set: {
              reportedAt: now,
              reportedBy: actorName,
              updatedAt: now,
            }
          });
        } else {
          await tx.delete(reportedParticipantTable).where(and(
            eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
            eq(reportedParticipantTable.assignmentId, assignment.id)
          ));
        }
      }
    });

    for (const assignment of assignments) {
      if (!assignment.studentId) continue;
      await NotificationService.dispatch({
        eventType: "REPORTING_PARTICIPANT_MARKED",
        festivalId: session.festivalId,
        targets: { studentIds: [assignment.studentId] },
        context: {
          title: "Reporting attendance updated",
          body: isReported
            ? "You have been marked as reported by stage manager."
            : "Your reporting mark was removed by stage manager.",
          payload: {
            reportingSessionId,
            assignmentId: assignment.id,
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
        reportedParticipants: true,
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is already locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }

    const effectiveEndedAt = session.scheduleEntry?.startTime || new Date().toISOString();

    const closed = await db.transaction(async (tx) => {
      const nowStr = new Date().toISOString();
      await tx.update(prsTable).set({
        status: "CLOSED",
        endedAt: effectiveEndedAt,
        endedBy: actorName,
        isLocked: true,
        windowEndsAt: null,
        updatedAt: nowStr,
      }).where(eq(prsTable.id, reportingSessionId));

      const studentCodes: { studentId: string; code: string }[] = [];

      const reportedWithStudent = session.reportedParticipants.filter(
        (r): r is typeof r & { studentId: string } => Boolean(r.studentId),
      );

      const isGroupProgramme = session.programme.type === "GROUP";

      if (isGroupProgramme) {
        type TeamBucket = { studentIds: Set<string> };
        const byTeam = new Map<string, TeamBucket>();

        for (const row of reportedWithStudent) {
          const teamKey =
            row.groupId != null && row.teamNumber != null
              ? `${row.groupId}\0${row.teamNumber}`
              : `legacy:${row.studentId}`;
          let bucket = byTeam.get(teamKey);
          if (!bucket) {
            bucket = { studentIds: new Set<string>() };
            byTeam.set(teamKey, bucket);
          }
          bucket.studentIds.add(row.studentId);
        }

        const teamBuckets = Array.from(byTeam.values());
        shuffleInPlace(teamBuckets);

        let ordinal = 0;
        for (const bucket of teamBuckets) {
          ordinal += 1;
          const code = sequentialAlphabetCode(ordinal);
          const codeLetterId = randomUUID();
          await tx.insert(codeLetterTable).values({
            id: codeLetterId,
            festivalId: session.festivalId,
            reportingSessionId,
            programmeId: session.programmeId,
            code,
            issuedBy: actorName,
            updatedAt: nowStr,
          });
          for (const studentId of bucket.studentIds) {
            await tx.insert(codeLetterRecipientTable).values({
              id: randomUUID(),
              codeLetterId: codeLetterId,
              studentId,
              updatedAt: nowStr,
            });
            studentCodes.push({ studentId, code });
          }
        }
      } else {
        shuffleInPlace(reportedWithStudent);

        let ordinal = 0;
        for (const row of reportedWithStudent) {
          ordinal += 1;
          const code = sequentialAlphabetCode(ordinal);
          const codeLetterId = randomUUID();
          await tx.insert(codeLetterTable).values({
            id: codeLetterId,
            festivalId: session.festivalId,
            reportingSessionId,
            programmeId: session.programmeId,
            code,
            issuedBy: actorName,
            updatedAt: nowStr,
          });
          await tx.insert(codeLetterRecipientTable).values({
            id: randomUUID(),
            codeLetterId: codeLetterId,
            studentId: row.studentId,
            updatedAt: nowStr,
          });
          studentCodes.push({ studentId: row.studentId, code });
        }
      }

      await tx.update(programmeTable).set({ 
        status: "STARTED",
        updatedAt: nowStr,
      }).where(eq(programmeTable.id, session.programmeId));

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
      columns: { id: true },
    });
    if (!session) return;
    await db.update(prsTable).set({ 
      isLocked: false, 
      status: "RESET",
      updatedAt: new Date().toISOString(),
    }).where(eq(prsTable.id, session.id));
  },

  async getReportingStats(reportingSessionId: string) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: true,
        reportedParticipants: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");

    const [assignmentCountResult] = await db
      .select({ c: count() })
      .from(assignmentTable)
      .where(eq(assignmentTable.programmeId, session.programmeId));
      
    const totalParticipants = assignmentCountResult.c;
    const isGroupProgramme = session.programme.type === "GROUP";

    let reportedCount: number;
    let totalUnits: number;

    if (isGroupProgramme) {
      const uniqueTeams = new Map<string, { members: number }>();
      for (const participant of session.reportedParticipants) {
        if (participant.groupId && participant.teamNumber !== null) {
          const teamKey = `${participant.groupId}-${participant.teamNumber}`;
          if (!uniqueTeams.has(teamKey)) {
            uniqueTeams.set(teamKey, { members: 0 });
          }
          uniqueTeams.get(teamKey)!.members += 1;
        }
      }
      reportedCount = uniqueTeams.size;

      const allAssignments = await db.query.programmeAssignment.findMany({
        where: eq(assignmentTable.programmeId, session.programmeId),
        columns: { groupId: true, teamNumber: true },
      });
      const totalUniqueTeams = new Map<string, number>();
      for (const assignment of allAssignments) {
        if (assignment.groupId && assignment.teamNumber !== null) {
          const teamKey = `${assignment.groupId}-${assignment.teamNumber}`;
          totalUniqueTeams.set(teamKey, (totalUniqueTeams.get(teamKey) || 0) + 1);
        }
      }
      totalUnits = totalUniqueTeams.size;
    } else {
      reportedCount = session.reportedParticipants.length;
      totalUnits = totalParticipants;
    }

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
        totalUnits > 0
          ? Math.round((reportedCount / totalUnits) * 100)
          : 0,
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
      teamNumber: number;
      code: string;
    }>,
    actorName: string,
  ) {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { type: true } },
        reportedParticipants: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is already locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }

    if (session.programme.type !== "GROUP") {
      throw new Error("Code assignment is only for group programmes");
    }

    const studentCodes: { studentId: string; code: string }[] = [];
    const nowStr = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const assignment of codeAssignments) {
        const teamParticipants = session.reportedParticipants.filter(
          (p) =>
            p.groupId !== null &&
            p.teamNumber === assignment.teamNumber &&
            p.studentId !== null,
        );

        if (teamParticipants.length === 0) {
          throw new Error(
            `Team ${assignment.teamNumber} has no reported participants`,
          );
        }

        const codeLetterId = randomUUID();
        await tx.insert(codeLetterTable).values({
          id: codeLetterId,
          festivalId: session.festivalId,
          reportingSessionId,
          programmeId: session.programmeId,
          code: assignment.code,
          issuedBy: actorName,
          updatedAt: nowStr,
        });

        for (const participant of teamParticipants) {
          if (participant.studentId) {
            await tx.insert(codeLetterRecipientTable).values({
              id: randomUUID(),
              codeLetterId: codeLetterId,
              studentId: participant.studentId,
              updatedAt: nowStr,
            });
            studentCodes.push({
              studentId: participant.studentId,
              code: assignment.code,
            });
          }
        }
      }

      await tx.update(prsTable).set({
        status: "CLOSED",
        endedAt: nowStr,
        endedBy: actorName,
        isLocked: true,
        windowEndsAt: null,
        updatedAt: nowStr,
      }).where(eq(prsTable.id, reportingSessionId));
      
      await tx.update(programmeTable).set({ 
        status: "STARTED",
        updatedAt: nowStr,
      }).where(eq(programmeTable.id, session.programmeId));
    });

    for (const { studentId, code } of studentCodes) {
      await NotificationService.dispatch({
        eventType: "REPORTING_CLOSED",
        festivalId: session.festivalId,
        targets: { studentIds: [studentId] },
        context: {
          title: "Your performance code",
          body: `Your code is ${code}. Please keep this safe for judgment.`,
          payload: {
            reportingSessionId,
            code,
            programmeId: session.programmeId,
          },
        },
        channels: ["IN_APP", "EMAIL"],
      });
    }

    
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

    return {
      success: true,
      codesAssigned: codeAssignments.length,
      studentsNotified: studentCodes.length,
    };
  },
};
