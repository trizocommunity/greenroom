"use server";

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { getTeamLeaderSessionFromCookie } from "@/core/auth/team-leader-session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  programmeNotification as notificationTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  student as studentTable,
  user as userTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { ProgrammeReportingService } from "@/features/programmes/services/programme-reporting.service";

async function assertStudentNotificationAccess(studentId: string) {
  const student = await db.query.student.findFirst({
    where: eq(studentTable.id, studentId),
    columns: { id: true, festivalId: true, groupId: true },
  });
  if (!student) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const session = await getSession();
  if (session?.userId) {
    if (session.role === "SUPER_ADMIN") return student;

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, student.festivalId),
      columns: { ownerId: true },
    });
    if (festival?.ownerId === session.userId) return student;

    const membership = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, student.festivalId),
        eq(festivalMemberTable.userId, session.userId),
      ),
      columns: { isActive: true },
    });
    if (membership?.isActive) return student;
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    tlSession &&
    new Date(tlSession.expiresAt) > new Date() &&
    !tlSession.revokedAt &&
    tlSession.festivalId === student.festivalId &&
    tlSession.studentId === studentId
  ) {
    return student;
  }

  throw new AppError(ERROR_MESSAGES.FORBIDDEN);
}

async function assertStageManagerAccess(festivalId: string): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { id: true, ownerId: true, tier: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  const canUseReporting = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );
  if (!canUseReporting) {
    throw new AppError(
      "Programme reporting is available on Standard plan and above.",
    );
  }

  const user = await db.query.user.findFirst({
    where: eq(userTable.id, session.userId),
    columns: { displayName: true, fullName: true, email: true },
  });

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    return (
      user?.displayName || user?.fullName || user?.email || "Stage Manager"
    );
  }

  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(festivalMemberTable.festivalId, festivalId),
      eq(festivalMemberTable.userId, session.userId),
    ),
    with: {
      user: { columns: { displayName: true, fullName: true, email: true } },
    },
  });

  if (
    !member?.isActive ||
    (member.role !== "STAGE_MANAGER" && member.role !== "ADMIN")
  ) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return (
    member.user.displayName ||
    member.user.fullName ||
    member.user.email ||
    "Stage Manager"
  );
}

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
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }
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
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }
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
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }
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
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }
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
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
    revalidatePath(`/${festival.slug}`);
  }
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

    const festival = await findFestivalById(festivalId);
    if (festival) {
      revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
    }

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

  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }

  return { success: true, data: result };
}
