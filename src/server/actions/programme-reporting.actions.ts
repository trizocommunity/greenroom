"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { ProgrammeReportingService } from "@/server/services/programme-reporting.service";

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
  const session = await getSession();
  if (session?.userId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { festivalId: true },
    });
    if (!student) return [];
  } else {
    const tlSession = await getTeamLeaderSessionFromCookie();
    if (
      !tlSession ||
      tlSession.studentId !== studentId ||
      tlSession.expiresAt <= new Date()
    ) {
      // Public student profiles have no auth; allow read-only notifications by id.
    }
  }

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
  await prisma.programmeNotification.updateMany({
    where: { id: notificationId, recipientStudentId: studentId },
    data: { isRead: true },
  });
  return { success: true };
}

export async function markAllStudentProgrammeNotificationsReadAction(
  studentId: string,
) {
  await prisma.programmeNotification.updateMany({
    where: { recipientStudentId: studentId, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

export async function getStudentOngoingProgrammesAction(studentId: string) {
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
