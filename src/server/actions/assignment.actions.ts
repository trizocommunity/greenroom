"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
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

export async function getAssignmentsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return AssignmentService.getAll(festivalId);
}

export async function createAssignmentAction(
  festivalId: string,
  data: {
    programmeId: string;
    studentId?: string;
    groupId?: string;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const userId = session!.userId;
  const actor = await getActorForCreatedBy(userId);

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
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const userId = session!.userId;
  const actor = await getActorForCreatedBy(userId);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (assignments.length === 0) return [];

  // Dependencies check not strictly needed per item if we assume bulk flow comes from a valid state,
  // but good to keep safe. The Service handles detail validation.
  // We can do a quick count check here if we want to fail fast for empty festival,
  // but let's rely on service validation for simplicity and robustness.

  return AssignmentService.bulkCreate(festivalId, assignments, actor);
}

export async function deleteAssignmentAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  return AssignmentService.delete(id, festivalId);
}

export async function deleteTeamAssignmentAction(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);

  assertAssignmentWindowOpen(festival);

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
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

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
  await assertFestivalAccess(session, festivalId);
  return AssignmentService.getTeamMembers(festivalId, programmeId, groupId, teamNumber);
}
