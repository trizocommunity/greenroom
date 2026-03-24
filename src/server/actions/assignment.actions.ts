"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { findFestivalById } from "@/server/models/festival.model";
import { AssignmentService } from "@/server/services/assignment.service";

async function getActorForCreatedBy(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, displayName: true },
  });

  if (!user) return {};

  return {
    createdByEmail: user.email,
    createdByName: user.displayName || user.fullName || user.email,
  };
}

function assertAssignmentWindowOpen(
  festival: { programmeAssignmentDeadline?: Date | null } | null,
) {
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > festival.programmeAssignmentDeadline
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED);
  }
}

type AssignmentActorContext =
  | { type: "user"; userId: string }
  | { type: "teamLeader"; studentId: string; groupId: string };

async function resolveAssignmentActorContext(
  festivalId: string,
): Promise<AssignmentActorContext> {
  const session = await getSession();
  if (session?.userId) {
    await assertFestivalAccess(session, festivalId);
    return { type: "user", userId: session.userId };
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    tlSession.expiresAt <= new Date() ||
    !tlSession.student?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    !tlSession.student.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return {
    type: "teamLeader",
    studentId: tlSession.studentId,
    groupId: tlSession.student.groupId,
  };
}

export async function getAssignmentsAction(festivalId: string) {
  const actor = await resolveAssignmentActorContext(festivalId);
  const all = await AssignmentService.getAll(festivalId);
  if (actor.type === "user") return all;
  return all.filter((a: any) => {
    const groupId = a?.groupId ?? a?.group?.id ?? a?.student?.groupId ?? a?.student?.group?.id;
    return groupId === actor.groupId;
  });
}

export async function createAssignmentAction(
  festivalId: string,
  data: {
    programmeId: string;
    studentId?: string;
    groupId?: string;
  },
) {
  const actorContext = await resolveAssignmentActorContext(festivalId);
  const actor =
    actorContext.type === "user"
      ? await getActorForCreatedBy(actorContext.userId)
      : {
          createdByEmail: undefined,
          createdByName: "Team Leader",
        };

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  // Validate Dependencies
  const [categoryCount, groupCount, programmeCount, studentCount] =
    await Promise.all([
      prisma.category.count({ where: { festivalId } }),
      prisma.group.count({ where: { festivalId } }),
      prisma.programme.count({ where: { festivalId } }),
      prisma.student.count({ where: { festivalId } }),
    ]);

  if (
    categoryCount === 0 ||
    groupCount === 0 ||
    programmeCount === 0 ||
    studentCount === 0
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEPENDENCIES_MISSING);
  }

  if (actorContext.type === "teamLeader" && data.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, festivalId: true, groupId: true },
    });
    if (
      !student ||
      student.festivalId !== festivalId ||
      student.groupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  return AssignmentService.create(festivalId, data, actor);
}

export async function bulkCreateAssignmentAction(
  festivalId: string,
  assignments: {
    programmeId: string;
    studentId: string;
    teamNumber?: number;
  }[],
) {
  const actorContext = await resolveAssignmentActorContext(festivalId);
  const actor =
    actorContext.type === "user"
      ? await getActorForCreatedBy(actorContext.userId)
      : {
          createdByEmail: undefined,
          createdByName: "Team Leader",
        };

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (assignments.length === 0) return [];

  if (actorContext.type === "teamLeader") {
    const studentIds = Array.from(new Set(assignments.map((a) => a.studentId)));
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, festivalId: true, groupId: true },
    });
    if (
      students.length !== studentIds.length ||
      students.some(
        (s) =>
          s.festivalId !== festivalId || s.groupId !== actorContext.groupId,
      )
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  // Dependencies check not strictly needed per item if we assume bulk flow comes from a valid state,
  // but good to keep safe. The Service handles detail validation.
  // We can do a quick count check here if we want to fail fast for empty festival,
  // but let's rely on service validation for simplicity and robustness.

  return AssignmentService.bulkCreate(festivalId, assignments, actor);
}

export async function deleteAssignmentAction(festivalId: string, id: string) {
  const actorContext = await resolveAssignmentActorContext(festivalId);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader") {
    const assignment = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { student: true, group: true },
    });
    const assignmentGroupId =
      assignment?.groupId ?? assignment?.student?.groupId ?? assignment?.group?.id;
    if (!assignment || assignment.festivalId !== festivalId || assignmentGroupId !== actorContext.groupId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  return AssignmentService.delete(id, festivalId);
}

export async function deleteTeamAssignmentAction(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
) {
  const actorContext = await resolveAssignmentActorContext(festivalId);

  const festival = await findFestivalById(festivalId);

  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader" && groupId !== actorContext.groupId) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return AssignmentService.deleteByTeam(
    festivalId,
    programmeId,
    groupId,
    teamNumber,
  );
}

export async function updateAssignmentAction(
  festivalId: string,
  id: string,
  data: {
    programmeId?: string;
    studentId?: string;
    groupId?: string;
  },
) {
  const actorContext = await resolveAssignmentActorContext(festivalId);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader") {
    const existing = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { student: true, group: true },
    });
    const existingGroupId =
      existing?.groupId ?? existing?.student?.groupId ?? existing?.group?.id;
    if (
      !existing ||
      existing.festivalId !== festivalId ||
      existingGroupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    if (data.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        select: { festivalId: true, groupId: true },
      });
      if (
        !student ||
        student.festivalId !== festivalId ||
        student.groupId !== actorContext.groupId
      ) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN);
      }
    }
  }

  return AssignmentService.update(id, festivalId, data);
}

export type ProgrammeTeamMember = {
  id: string;
  name: string;
  chestNumber?: string | null;
  categoryName?: string;
};

export async function getProgrammeTeamMembersAction(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
): Promise<ProgrammeTeamMember[]> {
  const session = await getSession();
  if (session?.userId) {
    await assertFestivalAccess(session, festivalId);
    return AssignmentService.getTeamMembers(festivalId, programmeId, groupId, teamNumber);
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    tlSession.expiresAt <= new Date() ||
    !tlSession.student?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    tlSession.student.groupId !== groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return AssignmentService.getTeamMembers(festivalId, programmeId, groupId, teamNumber);
}
