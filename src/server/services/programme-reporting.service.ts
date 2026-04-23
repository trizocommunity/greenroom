import { randomInt } from "node:crypto";
import type { ProgrammeReportingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitDomainRealtimeEvent } from "@/server/realtime/domain-events";
import { RealtimeRoom } from "@/server/realtime/rooms";
import { NotificationService } from "@/server/services/notification.service";

// Note: No hard time limit - reporting stays open until manually closed
// Estimated time is calculated dynamically based on reporting rate

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
  const existing = await prisma.programmeReportingSession.findUnique({
    where: { scheduleEntryId },
    include: {
      scheduleEntry: {
        include: { programme: true, stage: true },
      },
    },
  });
  if (existing) return existing;

  const entry = await prisma.scheduleEntry.findUnique({
    where: { id: scheduleEntryId },
    include: { programme: true, stage: true },
  });
  if (!entry || !entry.programmeId || !entry.programme) {
    throw new Error("Scheduled programme entry not found");
  }

  return prisma.programmeReportingSession.create({
    data: {
      festivalId: entry.festivalId,
      scheduleEntryId: entry.id,
      programmeId: entry.programmeId,
      stageId: entry.stageId,
      status: "NOT_STARTED",
    },
    include: {
      scheduleEntry: { include: { programme: true, stage: true } },
    },
  });
}

async function getAssignedRecipientsForSession(reportingSessionId: string) {
  const session = await prisma.programmeReportingSession.findUnique({
    where: { id: reportingSessionId },
    select: { festivalId: true, programmeId: true },
  });
  if (!session) return null;
  return session;
}

export const ProgrammeReportingService = {
  // Removed: REPORTING_WINDOW_MINUTES - no hard time limit

  async listByFestival(festivalId: string) {
    const entries = await prisma.scheduleEntry.findMany({
      where: {
        festivalId,
        type: "PROGRAMME",
      },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            status: true,
            type: true,
            category: { select: { id: true, name: true } },
          },
        },
        stage: { select: { id: true, name: true } },
        reportingSessions: {
          include: {
            reportedParticipants: true,
            codeLetters: {
              orderBy: { issuedAt: "asc" },
              include: {
                recipients: { select: { studentId: true } },
              },
            },
          },
        },
      },
      orderBy: [{ startTime: "asc" }, { order: "asc" }],
    });
    return entries.map((entry) => ({
      ...entry,
      reportingSession: entry.reportingSessions ?? null,
    }));
  },

  async start(scheduleEntryId: string, actorName: string) {
    const session = await getOrCreateSessionByScheduleEntry(scheduleEntryId);
    if (session.isLocked)
      throw new Error("Reporting is locked for this programme");
    if (session.status === "CLOSED")
      throw new Error("Reporting already closed");

    const now = new Date();
    // No hard time limit - windowEndsAt is null, reporting stays open until manually closed
    const windowEndsAt = null;

    const updated = await prisma.programmeReportingSession.update({
      where: { id: session.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: now,
        startedBy: actorName,
        endedAt: null,
        endedBy: null,
        windowEndsAt,
      },
    });

    const targets = await getAssignedRecipientsForSession(updated.id);
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
            reportingSessionId: updated.id,
            programmeId: targets.programmeId,
          },
        },
        channels: ["IN_APP", "REALTIME", "EMAIL"],
      });
    }

    await prisma.programme.update({
      where: { id: session.programmeId },
      data: { status: "REPORTING" },
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
        body: "Programme is now in Reporting status.",
        payload: { programmeId: session.programmeId, status: "REPORTING" },
      },
      channels: ["IN_APP", "REALTIME"],
    });
    await emitDomainRealtimeEvent({
      eventName: "reporting.updated",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: updated.id,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, updated.id),
      ],
      payload: {
        reportingSessionId: updated.id,
        programmeId: session.programmeId,
        status: "IN_PROGRESS",
      },
    });

    return updated;
  },

  async reset(reportingSessionId: string, actorName: string) {
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      include: {
        programme: { select: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");

    // Clear all reporting data in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all code letter recipients
      const codeLetters = await tx.programmeCodeLetter.findMany({
        where: { reportingSessionId },
        select: { id: true },
      });

      if (codeLetters.length > 0) {
        const codeLetterIds = codeLetters.map((cl) => cl.id);
        await tx.programmeCodeLetterRecipient.deleteMany({
          where: { codeLetterId: { in: codeLetterIds } },
        });
      }

      // 2. Delete all code letters
      await tx.programmeCodeLetter.deleteMany({
        where: { reportingSessionId },
      });

      // 3. Delete all reported participants
      await tx.programmeReportedParticipant.deleteMany({
        where: { reportingSessionId },
      });

      // 4. Reset the reporting session
      await tx.programmeReportingSession.update({
        where: { id: reportingSessionId },
        data: {
          status: "RESET",
          startedAt: null,
          startedBy: null,
          endedAt: new Date(),
          endedBy: actorName,
          windowEndsAt: null,
        },
      });

      // 5. Reset programme status
      await tx.programme.update({
        where: { id: session.programmeId },
        data: { status: "RESET" },
      });
    });

    // Send notifications
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
      channels: ["IN_APP", "REALTIME"],
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
      channels: ["IN_APP", "REALTIME", "EMAIL"],
    });

    await emitDomainRealtimeEvent({
      eventName: "reporting.updated",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: reportingSessionId,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, reportingSessionId),
      ],
      payload: {
        reportingSessionId,
        programmeId: session.programmeId,
        status: "RESET",
        cleared: true,
      },
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
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      select: {
        id: true,
        status: true,
        isLocked: true,
        windowEndsAt: true,
        festivalId: true,
        programmeId: true,
        programme: { select: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Reporting must be in progress to mark participants");
    }
    // No time check - reporting stays open until manually closed

    const assignment = await prisma.programmeAssignment.findUnique({
      where: { id: assignmentId },
      select: {
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
    if (
      session.programme.type === "INDIVIDUAL" &&
      (assignment.teamNumber ?? 1) > 1
    ) {
      throw new Error(
        "Invalid team assignment for individual programme reporting",
      );
    }
    if (
      session.programme.type === "GROUP" &&
      (assignment.teamNumber ?? 0) < 1
    ) {
      throw new Error("Invalid team assignment for group programme reporting");
    }

    if (isReported) {
      // For GROUP programmes, mark entire team when one member is scanned
      if (
        session.programme.type === "GROUP" &&
        assignment.groupId &&
        assignment.teamNumber
      ) {
        // Check if team already reported
        const existingTeamReport =
          await prisma.programmeReportedParticipant.findFirst({
            where: {
              reportingSessionId,
              groupId: assignment.groupId,
              teamNumber: assignment.teamNumber,
            },
          });

        if (existingTeamReport) {
          throw new Error(
            `Team ${assignment.teamNumber} has already been reported`,
          );
        }

        // Find all team assignments
        const teamAssignments = await prisma.programmeAssignment.findMany({
          where: {
            programmeId: session.programmeId,
            groupId: assignment.groupId,
            teamNumber: assignment.teamNumber,
          },
          select: {
            id: true,
            studentId: true,
          },
        });

        // Mark all team members as reported
        for (const teamAssignment of teamAssignments) {
          await prisma.programmeReportedParticipant.upsert({
            where: {
              reportingSessionId_assignmentId: {
                reportingSessionId,
                assignmentId: teamAssignment.id,
              },
            },
            update: {
              reportedAt: new Date(),
              reportedBy: actorName,
            },
            create: {
              reportingSessionId,
              assignmentId: teamAssignment.id,
              studentId: teamAssignment.studentId ?? null,
              groupId: assignment.groupId,
              teamNumber: assignment.teamNumber,
              reportedBy: actorName,
            },
          });
        }

        // Send notifications to all team members
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
            channels: ["IN_APP", "REALTIME"],
          });
        }

        // Emit realtime event for team
        await emitDomainRealtimeEvent({
          eventName: "reporting.participant_marked",
          festivalId: session.festivalId,
          entityType: "reportingSession",
          entityId: reportingSessionId,
          roomKeys: [
            RealtimeRoom.festivalAll(session.festivalId),
            RealtimeRoom.reportingSession(
              session.festivalId,
              reportingSessionId,
            ),
          ],
          payload: {
            reportingSessionId,
            teamNumber: assignment.teamNumber,
            membersCount: teamAssignments.length,
            isReported: true,
          },
        });
      } else {
        // INDIVIDUAL programme or team not specified - mark single participant
        await prisma.programmeReportedParticipant.upsert({
          where: {
            reportingSessionId_assignmentId: {
              reportingSessionId,
              assignmentId,
            },
          },
          update: {
            reportedAt: new Date(),
            reportedBy: actorName,
          },
          create: {
            reportingSessionId,
            assignmentId,
            studentId: assignment.studentId ?? null,
            groupId: assignment.groupId ?? null,
            teamNumber: assignment.teamNumber ?? null,
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
              body: isReported
                ? "You have been marked as reported by stage manager."
                : "Your reporting mark was removed by stage manager.",
              payload: { reportingSessionId, assignmentId, isReported },
            },
            channels: ["IN_APP", "REALTIME"],
          });
        }
        await emitDomainRealtimeEvent({
          eventName: "reporting.participant_marked",
          festivalId: session.festivalId,
          entityType: "reportingSession",
          entityId: reportingSessionId,
          roomKeys: [
            RealtimeRoom.festivalAll(session.festivalId),
            RealtimeRoom.reportingSession(
              session.festivalId,
              reportingSessionId,
            ),
          ],
          payload: {
            reportingSessionId,
            assignmentId,
            isReported,
          },
        });
      }
    } else {
      await prisma.programmeReportedParticipant.deleteMany({
        where: { reportingSessionId, assignmentId },
      });
    }

    if (assignment.studentId) {
      await NotificationService.dispatch({
        eventType: "REPORTING_PARTICIPANT_MARKED",
        festivalId: session.festivalId,
        targets: { studentIds: [assignment.studentId] },
        context: {
          title: "Reporting attendance updated",
          body: isReported
            ? "You have been marked as reported by stage manager."
            : "Your reporting mark was removed by stage manager.",
          payload: { reportingSessionId, assignmentId, isReported },
        },
        channels: ["IN_APP", "REALTIME"],
      });
    }
    await emitDomainRealtimeEvent({
      eventName: "reporting.participant_marked",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: reportingSessionId,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, reportingSessionId),
      ],
      payload: {
        reportingSessionId,
        assignmentId,
        isReported,
      },
    });
  },

  /**
   * Mark many assignments in one transaction (e.g. whole group team checked at once).
   */
  async markParticipantsBulk(
    reportingSessionId: string,
    assignmentIds: string[],
    isReported: boolean,
    actorName: string,
  ) {
    if (assignmentIds.length === 0) return;

    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      select: {
        id: true,
        status: true,
        isLocked: true,
        windowEndsAt: true,
        festivalId: true,
        programmeId: true,
        programme: { select: { type: true } },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Reporting must be in progress to mark participants");
    }
    // No time check - reporting stays open until manually closed

    const assignments = await prisma.programmeAssignment.findMany({
      where: { id: { in: assignmentIds } },
      select: {
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

    for (const assignment of assignments) {
      if (assignment.programmeId !== session.programmeId) {
        throw new Error(
          "Assignment does not belong to this programme reporting session",
        );
      }
      if (
        session.programme.type === "INDIVIDUAL" &&
        (assignment.teamNumber ?? 1) > 1
      ) {
        throw new Error(
          "Invalid team assignment for individual programme reporting",
        );
      }
      if (
        session.programme.type === "GROUP" &&
        (assignment.teamNumber ?? 0) < 1
      ) {
        throw new Error(
          "Invalid team assignment for group programme reporting",
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        if (isReported) {
          await tx.programmeReportedParticipant.upsert({
            where: {
              reportingSessionId_assignmentId: {
                reportingSessionId,
                assignmentId: assignment.id,
              },
            },
            update: {
              reportedAt: new Date(),
              reportedBy: actorName,
            },
            create: {
              reportingSessionId,
              assignmentId: assignment.id,
              studentId: assignment.studentId ?? null,
              groupId: assignment.groupId ?? null,
              teamNumber: assignment.teamNumber ?? null,
              reportedBy: actorName,
            },
          });
        } else {
          await tx.programmeReportedParticipant.deleteMany({
            where: {
              reportingSessionId,
              assignmentId: assignment.id,
            },
          });
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
        channels: ["IN_APP", "REALTIME"],
      });
    }
    await emitDomainRealtimeEvent({
      eventName: "reporting.participant_marked",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: reportingSessionId,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, reportingSessionId),
      ],
      payload: {
        reportingSessionId,
        assignmentIds,
        isReported,
      },
    });
  },

  async close(reportingSessionId: string, actorName: string) {
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      include: {
        programme: { select: { type: true } },
        scheduleEntry: { select: { startTime: true } },
        reportedParticipants: {
          select: {
            assignmentId: true,
            studentId: true,
            groupId: true,
            teamNumber: true,
          },
        },
      },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is already locked");
    if (session.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }

    const effectiveEndedAt = session.scheduleEntry.startTime ?? new Date();

    const closed = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.programmeReportingSession.update({
        where: { id: reportingSessionId },
        data: {
          status: "CLOSED",
          endedAt: effectiveEndedAt,
          endedBy: actorName,
          isLocked: true,
          windowEndsAt: null,
        },
      });

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
          const letter = await tx.programmeCodeLetter.create({
            data: {
              festivalId: session.festivalId,
              reportingSessionId,
              programmeId: session.programmeId,
              code,
              issuedBy: actorName,
            },
          });
          for (const studentId of bucket.studentIds) {
            await tx.programmeCodeLetterRecipient.create({
              data: {
                codeLetterId: letter.id,
                studentId,
              },
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
          const letter = await tx.programmeCodeLetter.create({
            data: {
              festivalId: session.festivalId,
              reportingSessionId,
              programmeId: session.programmeId,
              code,
              issuedBy: actorName,
            },
          });
          await tx.programmeCodeLetterRecipient.create({
            data: {
              codeLetterId: letter.id,
              studentId: row.studentId,
            },
          });
          studentCodes.push({ studentId: row.studentId, code });
        }
      }

      await tx.programme.update({
        where: { id: session.programmeId },
        // After reporting submit, judges can start working. Programme becomes STARTED.
        data: { status: "STARTED" },
      });

      return { updatedSession, studentCodes };
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
      channels: ["IN_APP", "REALTIME", "EMAIL"],
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
      channels: ["IN_APP", "REALTIME"],
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
        channels: ["IN_APP", "REALTIME"],
      });
    }
    await emitDomainRealtimeEvent({
      eventName: "reporting.updated",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: reportingSessionId,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, reportingSessionId),
      ],
      payload: {
        reportingSessionId,
        programmeId: session.programmeId,
        status: "CLOSED",
      },
    });

    return closed;
  },

  async unlockByScheduleEntryChange(scheduleEntryId: string) {
    const session = await prisma.programmeReportingSession.findUnique({
      where: { scheduleEntryId },
      select: { id: true },
    });
    if (!session) return;
    await prisma.programmeReportingSession.update({
      where: { id: session.id },
      data: { isLocked: false, status: "RESET" as ProgrammeReportingStatus },
    });
  },

  /**
   * Get reporting statistics including estimated completion time
   * Used to display progress and time estimates to stage managers
   */
  async getReportingStats(reportingSessionId: string) {
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      include: {
        programme: {
          include: {
            _count: { select: { assignments: true } },
          },
        },
        reportedParticipants: true,
      },
    });

    if (!session) throw new Error("Reporting session not found");

    const totalParticipants = session.programme._count.assignments;
    const isGroupProgramme = session.programme.type === "GROUP";

    // For GROUP programmes, count unique teams, not individual participants
    let reportedCount: number;
    let totalUnits: number; // Teams for GROUP, Students for INDIVIDUAL

    if (isGroupProgramme) {
      // Count unique teams (groupBy groupId + teamNumber)
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

      // Count total unique teams in assignments
      const allAssignments = await prisma.programmeAssignment.findMany({
        where: { programmeId: session.programmeId },
        select: { groupId: true, teamNumber: true },
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
      // INDIVIDUAL: count students directly
      reportedCount = session.reportedParticipants.length;
      totalUnits = totalParticipants;
    }

    const remaining = totalUnits - reportedCount;
    const startTime = session.startedAt;

    let estimatedEnd: Date | null = null;
    let estimatedRemainingMinutes: number | null = null;

    // Calculate estimated time only if reporting has started and we have data
    if (startTime && reportedCount > 0 && remaining > 0) {
      const elapsed = Date.now() - startTime.getTime();
      const rate = elapsed / reportedCount; // milliseconds per unit
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

  /**
   * Assign code letters to teams based on spin wheel selection
   * Creates code letters and assigns recipients
   */
  async assignCodesWithSpin(
    reportingSessionId: string,
    codeAssignments: Array<{
      teamNumber: number;
      code: string;
    }>,
    actorName: string,
  ) {
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      include: {
        programme: { select: { type: true } },
        reportedParticipants: {
          select: {
            assignmentId: true,
            studentId: true,
            groupId: true,
            teamNumber: true,
          },
        },
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

    // Process each code assignment
    await prisma.$transaction(async (tx) => {
      for (const assignment of codeAssignments) {
        // Find all reported participants for this team
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

        // Create code letter
        const codeLetter = await tx.programmeCodeLetter.create({
          data: {
            festivalId: session.festivalId,
            reportingSessionId,
            programmeId: session.programmeId,
            code: assignment.code,
            issuedBy: actorName,
          },
        });

        // Assign code to all team members
        for (const participant of teamParticipants) {
          if (participant.studentId) {
            await tx.programmeCodeLetterRecipient.create({
              data: {
                codeLetterId: codeLetter.id,
                studentId: participant.studentId,
              },
            });
            studentCodes.push({
              studentId: participant.studentId,
              code: assignment.code,
            });
          }
        }
      }

      // Close the reporting session
      await tx.programmeReportingSession.update({
        where: { id: reportingSessionId },
        data: {
          status: "CLOSED",
          endedAt: new Date(),
          endedBy: actorName,
          isLocked: true,
          windowEndsAt: null,
        },
      });
    });

    // Send notifications to all students with their codes
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
        channels: ["IN_APP", "REALTIME", "EMAIL"],
      });
    }

    // Emit realtime event
    await emitDomainRealtimeEvent({
      eventName: "reporting.updated",
      festivalId: session.festivalId,
      entityType: "reportingSession",
      entityId: reportingSessionId,
      roomKeys: [
        RealtimeRoom.festivalAll(session.festivalId),
        RealtimeRoom.reportingSession(session.festivalId, reportingSessionId),
      ],
      payload: {
        reportingSessionId,
        codesCount: codeAssignments.length,
        studentsCount: studentCodes.length,
      },
    });

    // Update programme status
    await prisma.programme.update({
      where: { id: session.programmeId },
      data: { status: "STARTED" },
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
      channels: ["IN_APP", "REALTIME"],
    });

    return {
      success: true,
      codesAssigned: codeAssignments.length,
      studentsNotified: studentCodes.length,
    };
  },
};
