"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeAssignment as assignmentTable,
  programmeNotification as notificationTable,
  participant as participantTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  assertParticipantNotificationAccess,
  assertReportingReopenAccess,
  assertStageManagerAccess,
  assertStageManagerAccessForStage,
} from "@/features/programmes/actions/reporting-access";
import { revalidateProgrammeReporting } from "@/features/programmes/actions/reporting-revalidation";
import { ReportingSessionRepository } from "@/features/programmes/repositories/reporting-session.repository";
import { ProgrammeReportingService } from "@/features/programmes/services/programme-reporting.service";

async function getProgrammeIdForReportingSession(reportingSessionId: string) {
  const session = await db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, reportingSessionId),
    columns: { programmeId: true },
  });
  return session?.programmeId;
}

export async function getStageIdForReportingSession(
  reportingSessionId: string,
) {
  const session = await db.query.programmeReportingSession.findFirst({
    where: eq(prsTable.id, reportingSessionId),
    columns: { stageId: true },
  });
  return session?.stageId ?? null;
}

export async function getProgrammeReportingBoardAction(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }
  await assertStageManagerAccess(festivalId);
  return ProgrammeReportingService.listByFestival(festivalId, session);
}

export async function startProgrammeReportingAction(
  festivalId: string,
  programmeId: string,
) {
  const existing = await db.query.programmeReportingSession.findFirst({
    where: and(
      eq(prsTable.festivalId, festivalId),
      eq(prsTable.programmeId, programmeId),
    ),
    columns: { stageId: true },
  });
  let stageId = existing?.stageId ?? null;
  if (!stageId) {
    const latestEntry = await db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.festivalId, festivalId),
        eq(scheduleEntryTable.programmeId, programmeId),
        eq(scheduleEntryTable.type, "PROGRAMME"),
      ),
      orderBy: [desc(scheduleEntryTable.startTime)],
      columns: { stageId: true },
    });
    stageId = latestEntry?.stageId ?? null;
  }
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);
  const res = await ProgrammeReportingService.startByProgramme(
    programmeId,
    festivalId,
    actorName,
  );
  await createAuditLog({
    action: "OPEN_REPORTING",
    targetType: "REPORTING_SESSION",
    targetId: res.id,
    metadata: { festivalId, programmeId: res.programmeId },
  }).catch((err) => console.error("[AuditLog] OPEN_REPORTING failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true, data: res };
}

export async function resetProgrammeReportingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);
  const res = await ProgrammeReportingService.reset(
    reportingSessionId,
    actorName,
  );
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true, data: res };
}

export async function markProgrammeParticipantAction(
  festivalId: string,
  reportingSessionId: string,
  assignmentId: string,
  isReported: boolean,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);
  await ProgrammeReportingService.markParticipant(
    reportingSessionId,
    assignmentId,
    isReported,
    actorName,
  );
  if (isReported) {
    const assignment = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, assignmentId),
      columns: { programmeId: true },
    });
    await createAuditLog({
      action: "MARK_REPORTED",
      targetType: "PROGRAMME_ASSIGNMENT",
      targetId: assignmentId,
      metadata: {
        festivalId,
        reportingSessionId,
        programmeId: assignment?.programmeId,
      },
    }).catch((err) => console.error("[AuditLog] MARK_REPORTED failed", err));
  }
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true };
}

export async function markProgrammeAssignmentsBulkAction(
  festivalId: string,
  reportingSessionId: string,
  assignmentIds: string[],
  isReported: boolean,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);
  await ProgrammeReportingService.markParticipantsBulk(
    reportingSessionId,
    assignmentIds,
    isReported,
    actorName,
  );
  if (isReported) {
    const programmeId =
      await getProgrammeIdForReportingSession(reportingSessionId);
    await createAuditLog({
      action: "MARK_REPORTED",
      targetType: "PROGRAMME_ASSIGNMENT",
      targetId: reportingSessionId,
      metadata: {
        festivalId,
        reportingSessionId,
        programmeId,
        count: assignmentIds.length,
      },
    }).catch((err) => console.error("[AuditLog] MARK_REPORTED failed", err));
  }
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true };
}

export async function closeProgrammeReportingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);
  const res = await ProgrammeReportingService.close(
    reportingSessionId,
    actorName,
  );
  await createAuditLog({
    action: "CLOSE_REPORTING",
    targetType: "REPORTING_SESSION",
    targetId: reportingSessionId,
    metadata: {
      festivalId,
      programmeId: await getProgrammeIdForReportingSession(reportingSessionId),
    },
  }).catch((err) => console.error("[AuditLog] CLOSE_REPORTING failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting-close");
  return { success: true, data: res };
}

export async function reopenProgrammeReportingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const actorName = await assertReportingReopenAccess(festivalId);
  const res = await ProgrammeReportingService.reopenClosedSession(
    reportingSessionId,
    actorName,
  );
  await revalidateProgrammeReporting(festivalId, "reporting-reopen");
  return { success: true, data: res };
}

export async function reopenProgrammeReportingByProgrammeAction(
  festivalId: string,
  programmeId: string,
) {
  const actorName = await assertReportingReopenAccess(festivalId);
  const res =
    await ProgrammeReportingService.reopenLatestClosedSessionByProgramme(
      programmeId,
      actorName,
    );
  await revalidateProgrammeReporting(festivalId, "reporting-reopen");
  return { success: true, data: res };
}

export async function getParticipantProgrammeNotificationsAction(
  participantId: string,
) {
  await assertParticipantNotificationAccess(participantId);

  return db.query.programmeNotification.findMany({
    where: eq(notificationTable.recipientParticipantId, participantId),
    orderBy: [desc(notificationTable.createdAt)],
    limit: 50,
  });
}

export async function markParticipantProgrammeNotificationReadAction(
  participantId: string,
  notificationId: string,
) {
  await assertParticipantNotificationAccess(participantId);
  await db
    .update(notificationTable)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(notificationTable.id, notificationId),
        eq(notificationTable.recipientParticipantId, participantId),
      ),
    );
  return { success: true };
}

export async function markAllParticipantProgrammeNotificationsReadAction(
  participantId: string,
) {
  await assertParticipantNotificationAccess(participantId);
  await db
    .update(notificationTable)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(notificationTable.recipientParticipantId, participantId),
        eq(notificationTable.isRead, false),
      ),
    );
  return { success: true };
}

export async function getParticipantOngoingProgrammesAction(
  participantId: string,
) {
  await assertParticipantNotificationAccess(participantId);
  const individualProgrammeIds = await db
    .selectDistinct({ programmeId: assignmentTable.programmeId })
    .from(assignmentTable)
    .where(eq(assignmentTable.participantId, participantId));
  const memberRows = await db
    .selectDistinct({ programmeId: assignmentTable.programmeId })
    .from(assignmentMemberTable)
    .innerJoin(
      assignmentTable,
      eq(assignmentTable.id, assignmentMemberTable.assignmentId),
    )
    .where(eq(assignmentMemberTable.participantId, participantId));
  const programmeIds = Array.from(
    new Set(
      [...individualProgrammeIds, ...memberRows].map((r) => r.programmeId),
    ),
  );
  if (!programmeIds.length) return [];

  const sessions = await db.query.programmeReportingSession.findMany({
    where: and(
      inArray(prsTable.programmeId, programmeIds),
      inArray(prsTable.status, ["IN_PROGRESS", "CLOSED"]),
    ),
    with: {
      programme: { columns: { id: true, name: true, status: true } },
      stage: { columns: { id: true, name: true } },
      programmeCodeLetters: {
        where: sql`revealed_at IS NOT NULL AND EXISTS (SELECT 1 FROM programme_code_letter_recipient WHERE code_letter_id = programme_code_letter.id AND participant_id = ${participantId})`,
        orderBy: [desc(sql`issued_at`)],
        limit: 8,
        with: {
          programmeCodeLetterRecipients: {
            where: eq(sql`participant_id`, participantId),
          },
        },
      },
    },
    orderBy: [desc(prsTable.updatedAt)],
    limit: 10,
  });
  return sessions;
}

export async function scanAndReportParticipantAction(
  festivalId: string,
  reportingSessionId: string,
  chestNumber: string,
) {
  try {
    const stageId = await getStageIdForReportingSession(reportingSessionId);
    const actorName = await assertStageManagerAccessForStage(
      festivalId,
      stageId,
    );
    const normalizedChestNumber = chestNumber.trim().toUpperCase();

    if (!normalizedChestNumber) {
      return {
        success: false,
        error: "Invalid chest number",
        reason: "CHEST_NUMBER_EMPTY",
      };
    }

    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      with: {
        programme: { columns: { id: true, name: true, type: true } },
      },
    });

    if (!session) {
      return {
        success: false,
        error: "Reporting session not found",
        reason: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "IN_PROGRESS") {
      return {
        success: false,
        error: `Reporting is ${session.status.toLowerCase()}`,
        reason: "SESSION_NOT_ACTIVE",
        sessionStatus: session.status,
      };
    }

    const assignment =
      await ReportingSessionRepository.findAssignmentByChestNumber(
        reportingSessionId,
        normalizedChestNumber,
      );

    if (!assignment) {
      const participant = await db.query.participant.findFirst({
        where: and(
          eq(participantTable.festivalId, festivalId),
          sql`UPPER(${participantTable.chestNumber}) = ${normalizedChestNumber}`,
        ),
        with: {
          group: { columns: { id: true, name: true } },
          category: { columns: { id: true, name: true } },
        },
      });

      return {
        success: false,
        error: `${participant?.name ?? "Participant"} is not assigned to "${session.programme?.name}"`,
        reason: "NOT_ASSIGNED_TO_PROGRAMME",
        participant: participant
          ? {
              id: participant.id,
              name: participant.name,
              chestNumber: participant.chestNumber,
              groupName: participant.group?.name,
              categoryName: participant.category?.name,
            }
          : undefined,
        programme: {
          id: session.programmeId,
          name: session.programme?.name,
        },
      };
    }

    const participant = await db.query.participant.findFirst({
      where: eq(participantTable.id, assignment.participantId),
      with: {
        group: { columns: { id: true, name: true } },
        category: { columns: { id: true, name: true } },
      },
    });

    if (!participant) {
      return {
        success: false,
        error: `No participant found for assignment`,
        reason: "PARTICIPANT_NOT_FOUND",
        chestNumber: normalizedChestNumber,
      };
    }

    const existingReport =
      await db.query.programmeReportedParticipant.findFirst({
        where: and(
          eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
          eq(reportedParticipantTable.assignmentId, assignment.assignmentId),
        ),
      });

    if (existingReport) {
      return {
        success: false,
        error: `${participant.name} has already been reported`,
        reason: "ALREADY_REPORTED",
        participant: {
          id: participant.id,
          name: participant.name,
          chestNumber: participant.chestNumber,
          groupName: participant.group?.name,
        },
        programme: {
          id: session.programmeId,
          name: session.programme?.name,
        },
      };
    }

    await ProgrammeReportingService.markParticipant(
      reportingSessionId,
      assignment.assignmentId,
      true,
      actorName,
    );

    await revalidateProgrammeReporting(festivalId, "reporting");

    return {
      success: true,
      message: `${participant.name} reported successfully`,
      participant: {
        id: participant.id,
        name: participant.name,
        chestNumber: participant.chestNumber,
        groupName: participant.group?.name,
        categoryName: participant.category?.name,
      },
      programme: {
        id: session.programmeId,
        name: session.programme?.name,
      },
      assignment: {
        id: assignment.assignmentId,
        teamNumber: assignment.teamNumber,
      },
    };
  } catch (error) {
    console.error("QR scan and report failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to process QR code",
      reason: "SYSTEM_ERROR",
    };
  }
}

export async function getReportingStatsAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  await assertStageManagerAccessForStage(festivalId, stageId);
  const stats =
    await ProgrammeReportingService.getReportingStats(reportingSessionId);
  return { success: true, data: stats };
}

/**
 * Step 1 → step 2 of the reporting drawer. Closes checkout, deals every
 * checked-out unit a shuffled code letter, and opens the scratch grid.
 */
export async function completeCheckoutAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);

  const result = await ProgrammeReportingService.completeCheckout(
    reportingSessionId,
    actorName,
  );
  await createAuditLog({
    action: "ISSUE_CODE_LETTER",
    targetType: "REPORTING_SESSION",
    targetId: reportingSessionId,
    metadata: {
      festivalId,
      count: result.tileCount,
      programmeId: await getProgrammeIdForReportingSession(reportingSessionId),
    },
  }).catch((err) => console.error("[AuditLog] ISSUE_CODE_LETTER failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting");

  return { success: true, data: result };
}

/** Scratches a single tile and returns the letter underneath it. */
export async function revealScratchCodeAction(
  festivalId: string,
  reportingSessionId: string,
  codeLetterId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);

  const result = await ProgrammeReportingService.revealScratchCode(
    reportingSessionId,
    codeLetterId,
    actorName,
  );
  await revalidateProgrammeReporting(festivalId, "reporting");

  return { success: true, data: result };
}

/** Escape hatch: reveals every tile still unscratched. */
export async function revealAllRemainingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const stageId = await getStageIdForReportingSession(reportingSessionId);
  const actorName = await assertStageManagerAccessForStage(festivalId, stageId);

  const result = await ProgrammeReportingService.revealAllRemaining(
    reportingSessionId,
    actorName,
  );
  await createAuditLog({
    action: "ISSUE_CODE_LETTER",
    targetType: "REPORTING_SESSION",
    targetId: reportingSessionId,
    metadata: {
      festivalId,
      count: result.revealedCount,
      revealedAll: true,
      programmeId: await getProgrammeIdForReportingSession(reportingSessionId),
    },
  }).catch((err) => console.error("[AuditLog] ISSUE_CODE_LETTER failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting");

  return { success: true, data: result };
}
