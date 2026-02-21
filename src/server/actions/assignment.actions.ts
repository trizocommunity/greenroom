"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";
import { AssignmentService } from "@/server/services/assignment.service";

export async function getAssignmentsAction(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  // Check if owner or member
  const isOwner = await prisma.festival.findFirst({
    where: { id: festivalId, ownerId: session.userId },
  });

  if (!isOwner) {
    const isMember = await findMemberByFestivalAndUser(festivalId, session.userId);
    if (!isMember) throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > festival.programmeAssignmentDeadline
  ) {
    const isAdmin = festival.ownerId === session.userId;
    // Also likely check if member role is ADMIN?
    // For now keeping existing logic (Owner only bypass) as requested scope is removing Team Leader.
    if (!isAdmin) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED);
    }
  }

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

  return AssignmentService.create(festivalId, data);
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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > festival.programmeAssignmentDeadline
  ) {
    const isAdmin = festival.ownerId === session.userId;
    if (!isAdmin) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED);
    }
  }

  if (assignments.length === 0) return [];

  // Dependencies check not strictly needed per item if we assume bulk flow comes from a valid state,
  // but good to keep safe. The Service handles detail validation.
  // We can do a quick count check here if we want to fail fast for empty festival,
  // but let's rely on service validation for simplicity and robustness.

  return AssignmentService.bulkCreate(festivalId, assignments);
}

export async function deleteAssignmentAction(festivalId: string, id: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > festival.programmeAssignmentDeadline
  ) {
    const isAdmin = festival.ownerId === session.userId;
    if (!isAdmin) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED_ADMIN);
    }
  }

  return AssignmentService.delete(id, festivalId);
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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);

  // Deadline Check
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > festival.programmeAssignmentDeadline
  ) {
    const isAdmin = festival.ownerId === session.userId;
    if (!isAdmin) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED_ADMIN);
    }
  }

  return AssignmentService.update(id, festivalId, data);
}
