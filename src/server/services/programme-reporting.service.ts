import { randomInt } from "node:crypto";
import type { ProgrammeReportingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitDomainRealtimeEvent } from "@/server/realtime/domain-events";
import { RealtimeRoom } from "@/server/realtime/rooms";
import { NotificationService } from "@/server/services/notification.service";

const REPORTING_WINDOW_MINUTES = 5;

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
  REPORTING_WINDOW_MINUTES,

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
    const windowEndsAt = new Date(
      now.getTime() + REPORTING_WINDOW_MINUTES * 60 * 1000,
    );

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
      select: { id: true, festivalId: true, programmeId: true, isLocked: true },
    });
    if (!session) throw new Error("Reporting session not found");
    if (session.isLocked) throw new Error("Reporting is locked");

    const updated = await prisma.programmeReportingSession.update({
      where: { id: reportingSessionId },
      data: {
        status: "RESET",
        endedAt: new Date(),
        endedBy: actorName,
        windowEndsAt: null,
      },
    });

    await prisma.programme.update({
      where: { id: session.programmeId },
      data: { status: "SCHEDULED" },
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
        body: "Programme status returned to Scheduled.",
        payload: { programmeId: session.programmeId, status: "SCHEDULED" },
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
        title: "Reporting closed",
        body: "The reporting window was closed without submitting (Stop / Reset). No code letters were issued.",
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
      },
    });

    return updated;
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
    if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
      throw new Error(
        "Reporting window has ended. Restart reporting to continue marking.",
      );
    }

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
      await prisma.programmeReportedParticipant.upsert({
        where: {
          reportingSessionId_assignmentId: { reportingSessionId, assignmentId },
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
    if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
      throw new Error(
        "Reporting window has ended. Restart reporting to continue marking.",
      );
    }

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
};
