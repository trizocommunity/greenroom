import { and, eq } from "drizzle-orm";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  student as studentTable,
  user as userTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import type { Tier } from "@/core/types/app-enums";
import { parseStoredInstant } from "@/core/utils/date-time";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

async function getFestivalWithReportingAccess(festivalId: string) {
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

  return festival;
}

async function getUserDisplayName(userId: string, fallback: string) {
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { displayName: true, fullName: true, email: true },
  });
  return user?.displayName || user?.fullName || user?.email || fallback;
}

export async function assertStudentNotificationAccess(studentId: string) {
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

  const tlSession = await getParticipantSessionFromCookie();
  if (
    tlSession &&
    parseStoredInstant(tlSession.expiresAt) > new Date() &&
    !tlSession.revokedAt &&
    tlSession.festivalId === student.festivalId &&
    tlSession.studentId === studentId
  ) {
    return student;
  }

  throw new AppError(ERROR_MESSAGES.FORBIDDEN);
}

export async function assertStageManagerAccess(
  festivalId: string,
): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await getFestivalWithReportingAccess(festivalId);
  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    return getUserDisplayName(session.userId, "Stage Manager");
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

/**
 * Same as assertStageManagerAccess, plus: a STAGE_MANAGER (not owner/admin/super_admin)
 * must be assigned to `stageId` specifically. Pass a null/undefined stageId for
 * festival-wide entries (e.g. non-stage schedule entries) that any manager may act on.
 */
export async function assertStageManagerAccessForStage(
  festivalId: string,
  stageId: string | null | undefined,
): Promise<string> {
  const actorName = await assertStageManagerAccess(festivalId);
  if (!stageId) return actorName;

  const session = await getSession();
  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    session,
  );
  if (accessibleStageIds !== "all" && !accessibleStageIds.includes(stageId)) {
    throw new AppError("You are not assigned to this stage.");
  }
  return actorName;
}

export async function assertReportingReopenAccess(
  festivalId: string,
): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await getFestivalWithReportingAccess(festivalId);
  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    return getUserDisplayName(session.userId, "Festival Admin");
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

  if (!member?.isActive || member.role !== "ADMIN") {
    throw new AppError(
      "Only festival owners or admins can reopen reporting after close.",
    );
  }

  return (
    member.user.displayName ||
    member.user.fullName ||
    member.user.email ||
    "Festival Admin"
  );
}
