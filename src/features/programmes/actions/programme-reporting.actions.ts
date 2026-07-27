"use server";

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeNotification as notificationTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  student as studentTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  assertReportingReopenAccess,
  assertStageManagerAccess,
  assertStudentNotificationAccess,
} from "@/features/programmes/actions/reporting-access";
import { revalidateProgrammeReporting } from "@/features/programmes/actions/reporting-revalidation";
import { ProgrammeReportingService } from "@/features/programmes/services/programme-reporting.service";

export async function getProgrammeReportingBoardAction(festivalId: string) {
  const actor = await getSession();
  if (actor?.userId) {
    await assertStageManagerAccess(festivalId);
  } else {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }
  return ProgrammeReportingService.listByFestival(festivalId);
}

export async function startProgrammeReportingAction(
  festivalId: string,
  scheduleEntryId: string,
) {
  const actorName = await assertStageManagerAccess(festivalId);
  const res = await ProgrammeReportingService.start(scheduleEntryId, actorName);
  await createAuditLog({
    action: "OPEN_REPORTING",
    targetType: "REPORTING_SESSION",
    targetId: res.id,
    metadata: { festivalId, scheduleEntryId },
  }).catch((err) => console.error("[AuditLog] OPEN_REPORTING failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true, data: res };
}

export async function resetProgrammeReportingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const actorName = await assertStageManagerAccess(festivalId);
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
  const actorName = await assertStageManagerAccess(festivalId);
  await ProgrammeReportingService.markParticipant(
    reportingSessionId,
    assignmentId,
    isReported,
    actorName,
  );
  if (isReported) {
    await createAuditLog({
      action: "MARK_REPORTED",
      targetType: "PROGRAMME_ASSIGNMENT",
      targetId: assignmentId,
      metadata: { festivalId, reportingSessionId },
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
  const actorName = await assertStageManagerAccess(festivalId);
  await ProgrammeReportingService.markParticipantsBulk(
    reportingSessionId,
    assignmentIds,
    isReported,
    actorName,
  );
  if (isReported) {
    await createAuditLog({
      action: "MARK_REPORTED",
      targetType: "PROGRAMME_ASSIGNMENT",
      targetId: reportingSessionId,
      metadata: { festivalId, reportingSessionId, count: assignmentIds.length },
    }).catch((err) => console.error("[AuditLog] MARK_REPORTED failed", err));
  }
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true };
}

export async function closeProgrammeReportingAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const actorName = await assertStageManagerAccess(festivalId);
  const res = await ProgrammeReportingService.close(
    reportingSessionId,
    actorName,
  );
  await createAuditLog({
    action: "CLOSE_REPORTING",
    targetType: "REPORTING_SESSION",
    targetId: reportingSessionId,
    metadata: { festivalId },
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

export async function getStudentProgrammeNotificationsAction(
  studentId: string,
) {
  await assertStudentNotificationAccess(studentId);

  return db.query.programmeNotification.findMany({
    where: eq(notificationTable.recipientStudentId, studentId),
    orderBy: [desc(notificationTable.createdAt)],
    limit: 50,
  });
}

export async function markStudentProgrammeNotificationReadAction(
  studentId: string,
  notificationId: string,
) {
  await assertStudentNotificationAccess(studentId);
  await db
    .update(notificationTable)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(notificationTable.id, notificationId),
        eq(notificationTable.recipientStudentId, studentId),
      ),
    );
  return { success: true };
}

export async function markAllStudentProgrammeNotificationsReadAction(
  studentId: string,
) {
  await assertStudentNotificationAccess(studentId);
  await db
    .update(notificationTable)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(notificationTable.recipientStudentId, studentId),
        eq(notificationTable.isRead, false),
      ),
    );
  return { success: true };
}

export async function getStudentOngoingProgrammesAction(studentId: string) {
  await assertStudentNotificationAccess(studentId);
  const assignments = await db.query.programmeAssignment.findMany({
    where: eq(assignmentTable.studentId, studentId),
    columns: { programmeId: true },
  });
  const programmeIds = Array.from(
    new Set(assignments.map((a) => a.programmeId)),
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
        where: sql`EXISTS (SELECT 1 FROM programme_code_letter_recipient WHERE code_letter_id = programme_code_letter.id AND student_id = ${studentId})`,
        orderBy: [desc(sql`issued_at`)],
        limit: 8,
        with: {
          programmeCodeLetterRecipients: {
            where: eq(sql`student_id`, studentId),
          },
        },
      },
    },
    orderBy: [desc(prsTable.updatedAt)],
    limit: 10,
  });
  return sessions;
}

export async function scanAndReportStudentAction(
  festivalId: string,
  reportingSessionId: string,
  chestNumber: string,
) {
  try {
    const actorName = await assertStageManagerAccess(festivalId);
    const normalizedChestNumber = chestNumber.trim().toUpperCase();

    if (!normalizedChestNumber) {
      return {
        success: false,
        error: "Invalid chest number",
        reason: "CHEST_NUMBER_EMPTY",
      };
    }

    const student = await db.query.student.findFirst({
      where: and(
        eq(studentTable.festivalId, festivalId),
        sql`UPPER(${studentTable.chestNumber}) = ${normalizedChestNumber}`,
      ),
      with: {
        group: { columns: { id: true, name: true } },
        category: { columns: { id: true, name: true } },
      },
    });

    if (!student) {
      return {
        success: false,
        error: `No student found with chest number: ${normalizedChestNumber}`,
        reason: "STUDENT_NOT_FOUND",
        chestNumber: normalizedChestNumber,
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

    const assignment = await db.query.programmeAssignment.findFirst({
      where: and(
        eq(assignmentTable.programmeId, session.programmeId),
        eq(assignmentTable.studentId, student.id),
      ),
    });

    if (!assignment) {
      return {
        success: false,
        error: `${student.name} is not assigned to "${session.programme?.name}"`,
        reason: "NOT_ASSIGNED_TO_PROGRAMME",
        student: {
          id: student.id,
          name: student.name,
          chestNumber: student.chestNumber,
          groupName: student.group?.name,
          categoryName: student.category?.name,
        },
        programme: {
          id: session.programmeId,
          name: session.programme?.name,
        },
      };
    }

    const existingReport =
      await db.query.programmeReportedParticipant.findFirst({
        where: and(
          eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
          eq(reportedParticipantTable.assignmentId, assignment.id),
        ),
      });

    if (existingReport) {
      return {
        success: false,
        error: `${student.name} has already been reported`,
        reason: "ALREADY_REPORTED",
        student: {
          id: student.id,
          name: student.name,
          chestNumber: student.chestNumber,
          groupName: student.group?.name,
        },
        programme: {
          id: session.programmeId,
          name: session.programme?.name,
        },
      };
    }

    await ProgrammeReportingService.markParticipant(
      reportingSessionId,
      assignment.id,
      true,
      actorName,
    );

    await revalidateProgrammeReporting(festivalId, "reporting");

    return {
      success: true,
      message: `${student.name} reported successfully`,
      student: {
        id: student.id,
        name: student.name,
        chestNumber: student.chestNumber,
        groupName: student.group?.name,
        categoryName: student.category?.name,
      },
      programme: {
        id: session.programmeId,
        name: session.programme?.name,
      },
      assignment: {
        id: assignment.id,
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
  await assertStageManagerAccess(festivalId);
  const stats =
    await ProgrammeReportingService.getReportingStats(reportingSessionId);
  return { success: true, data: stats };
}

export async function assignCodeLettersWithSpinAction(
  festivalId: string,
  reportingSessionId: string,
  codeAssignments: Array<{
    teamNumber: number | null;
    groupId?: string | null;
    studentId?: string | null;
    code: string;
  }>,
) {
  const actorName = await assertStageManagerAccess(festivalId);

  const result = await ProgrammeReportingService.assignCodesWithSpin(
    reportingSessionId,
    codeAssignments,
    actorName,
  );
  await createAuditLog({
    action: "ISSUE_CODE_LETTER",
    targetType: "REPORTING_SESSION",
    targetId: reportingSessionId,
    metadata: { festivalId, count: codeAssignments.length },
  }).catch((err) => console.error("[AuditLog] ISSUE_CODE_LETTER failed", err));
  await revalidateProgrammeReporting(festivalId, "reporting");

  return { success: true, data: result };
}

export async function resetSpinCodeLettersAction(
  festivalId: string,
  reportingSessionId: string,
) {
  const actorName = await assertStageManagerAccess(festivalId);
  const result = await ProgrammeReportingService.resetSpinCodeLetters(
    reportingSessionId,
    actorName,
  );
  await revalidateProgrammeReporting(festivalId, "reporting");
  return { success: true, data: result };
}
