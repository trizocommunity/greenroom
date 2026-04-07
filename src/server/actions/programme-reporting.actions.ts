"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { ProgrammeReportingService } from "@/server/services/programme-reporting.service";

async function assertStudentNotificationAccess(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, festivalId: true, groupId: true },
  });
  if (!student) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const session = await getSession();
  if (session?.userId) {
    if (session.role === "SUPER_ADMIN") return student;

    const festival = await prisma.festival.findUnique({
      where: { id: student.festivalId },
      select: { ownerId: true },
    });
    if (festival?.ownerId === session.userId) return student;

    const membership = await prisma.festivalMember.findUnique({
      where: {
        festivalId_userId: {
          festivalId: student.festivalId,
          userId: session.userId,
        },
      },
      select: { isActive: true },
    });
    if (membership?.isActive) return student;
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    tlSession &&
    tlSession.expiresAt > new Date() &&
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

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { id: true, ownerId: true, tier: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  const canUseReporting = await getEffectiveFeatureEnabled(
    festival.tier,
    "schedule",
  );
  if (!canUseReporting) {
    throw new AppError(
      "Programme reporting is available on Standard plan and above.",
    );
  }

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true, fullName: true, email: true },
    });
    return (
      user?.displayName || user?.fullName || user?.email || "Stage Manager"
    );
  }

  const member = await prisma.festivalMember.findUnique({
    where: { festivalId_userId: { festivalId, userId: session.userId } },
    select: {
      role: true,
      isActive: true,
      user: { select: { displayName: true, fullName: true, email: true } },
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

  return prisma.programmeNotification.findMany({
    where: { recipientStudentId: studentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markStudentProgrammeNotificationReadAction(
  studentId: string,
  notificationId: string,
) {
  await assertStudentNotificationAccess(studentId);
  await prisma.programmeNotification.updateMany({
    where: { id: notificationId, recipientStudentId: studentId },
    data: { isRead: true },
  });
  return { success: true };
}

export async function markAllStudentProgrammeNotificationsReadAction(
  studentId: string,
) {
  await assertStudentNotificationAccess(studentId);
  await prisma.programmeNotification.updateMany({
    where: { recipientStudentId: studentId, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

export async function getStudentOngoingProgrammesAction(studentId: string) {
  await assertStudentNotificationAccess(studentId);
  const assignments = await prisma.programmeAssignment.findMany({
    where: { studentId },
    select: { programmeId: true },
  });
  const programmeIds = Array.from(
    new Set(assignments.map((a) => a.programmeId)),
  );
  if (!programmeIds.length) return [];

  const sessions = await prisma.programmeReportingSession.findMany({
    where: {
      programmeId: { in: programmeIds },
      status: { in: ["IN_PROGRESS", "CLOSED"] },
    },
    include: {
      programme: { select: { id: true, name: true, status: true } },
      stage: { select: { id: true, name: true } },
      codeLetters: {
        where: { recipients: { some: { studentId } } },
        orderBy: { issuedAt: "desc" },
        take: 8,
        include: {
          recipients: { where: { studentId } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  return sessions;
}

/**
 * Scan QR code (chest number) and report student for current programme
 * Validates: festival exists, student exists, student assigned to programme
 */
export async function scanAndReportStudentAction(
  festivalId: string,
  reportingSessionId: string,
  chestNumber: string,
) {
  try {
    // Validate stage manager access
    const actorName = await assertStageManagerAccess(festivalId);

    // Normalize chest number (trim and uppercase)
    const normalizedChestNumber = chestNumber.trim().toUpperCase();

    if (!normalizedChestNumber) {
      return {
        success: false,
        error: "Invalid chest number",
        reason: "CHEST_NUMBER_EMPTY",
      };
    }

    // Find student by chest number in this festival
    const student = await prisma.student.findFirst({
      where: {
        festivalId,
        chestNumber: {
          equals: normalizedChestNumber,
          mode: "insensitive",
        },
      },
      include: {
        group: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
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

    // Get the reporting session with programme info
    const session = await prisma.programmeReportingSession.findUnique({
      where: { id: reportingSessionId },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
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

    // Check if student is assigned to this programme
    const assignment = await prisma.programmeAssignment.findFirst({
      where: {
        programmeId: session.programmeId,
        studentId: student.id,
      },
      include: {
        programme: { select: { name: true, type: true } },
        group: { select: { name: true } },
      },
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

    // Check if already reported
    const existingReport = await prisma.programmeReportedParticipant.findFirst({
      where: {
        reportingSessionId,
        assignmentId: assignment.id,
      },
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

    // Mark as present
    await ProgrammeReportingService.markParticipant(
      reportingSessionId,
      assignment.id,
      true,
      actorName,
    );

    // Revalidate paths
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
