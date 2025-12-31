"use server";

import { prisma } from "@/lib/db";

import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";
import { AssignmentService } from "@/server/services/assignment.service";

export async function getAssignmentsAction(festivalId: string) {
  // TODO: Add filtering if needed for other roles, but for now return all
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
      throw new Error("Programme assignment deadline has passed.");
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
    throw new Error(
      "Create categories, groups, programmes & students first.",
    );
  }

  return AssignmentService.create(festivalId, data);
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
      throw new Error("Deadline has passed.");
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
      throw new Error("Deadline has passed.");
    }
  }

  return AssignmentService.update(id, festivalId, data);
}
