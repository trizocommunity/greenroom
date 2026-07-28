"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { parseStoredInstant } from "@/core/utils/date-time";
import { assignChestNumberForStudentInternal } from "@/features/students/actions/chest-number.actions";
import { StudentService } from "@/features/students/services/student.service";

async function resolveTeamLeaderContext(festivalId: string) {
  const tlSession = await getParticipantSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    parseStoredInstant(tlSession.expiresAt) <= new Date() ||
    !tlSession.student?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    !tlSession.student.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return {
    studentId: tlSession.studentId,
    groupId: tlSession.student.groupId,
    profileSlug: tlSession.student.profileSlug,
  };
}

export async function createStudentAsTeamLeaderAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    email?: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth: string;
    standard?: string;
  },
) {
  const ctx = await resolveTeamLeaderContext(festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { studentCreationDeadline: true, slug: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  if (
    festival.studentCreationDeadline &&
    new Date() > parseStoredInstant(festival.studentCreationDeadline)
  ) {
    throw new AppError(ERROR_MESSAGES.STUDENT_CREATION_DEADLINE_PASSED);
  }

  const newStudent = await StudentService.create(festivalId, {
    name: data.name,
    groupId: ctx.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender ?? "MALE",
    dateOfBirth: data.dateOfBirth,
    standard: data.standard,
  });

  await assignChestNumberForStudentInternal(festivalId, newStudent.id);

  try {
    if (ctx.profileSlug) {
      revalidatePath(`/${festival.slug}/${ctx.profileSlug}/my-students`);
    }
  } catch (error) {
    console.error("[revalidatePath] my-students page", error);
  }

  return newStudent;
}
