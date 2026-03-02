"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIER_CONFIG } from "@/config/pricing";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getResolvedTier } from "@/lib/tier";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { StudentService } from "@/server/services/student.service";

export async function getStudentsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return StudentService.getAll(festivalId);
}

export async function createStudentWithServiceAction(
  festivalId: string,
  data: {
    name: string;
    groupId: string;
    categoryId: string;
    email?: string;
    phone?: string;
    gender?: string;

    age?: number;
    standard?: string;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  // Validate Dependencies
  const [groupCount, categoryCount] = await Promise.all([
    prisma.group.count({ where: { festivalId } }),
    prisma.category.count({ where: { festivalId } }),
  ]);

  if (groupCount === 0 || categoryCount === 0) {
    throw new Error("Create groups & categories first.");
  }

  return StudentService.create(festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: (data.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",

    age: data.age,
    standard: data.standard,
  });
}

export async function validateStudentsAction(
  festivalId: string,
  candidates: { name: string; email?: string }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  // 1. Extract non-empty emails and names
  const emails = candidates
    .map((c) => c.email?.trim().toLowerCase())
    .filter((e): e is string => !!e);

  const names = candidates.map((c) => c.name.trim().toLowerCase());

  // 2. Find matches in DB
  // We check for:
  // A) Email match (if email provided)
  // B) Name match (case insensitive)

  const existingStudents = await prisma.student.findMany({
    where: {
      festivalId,
      OR: [
        { email: { in: emails, mode: "insensitive" } },
        { name: { in: names, mode: "insensitive" } },
      ],
    },
    select: { name: true, email: true },
  });

  // 3. Return a Set-like structure for easy client-side lookup
  // We'll return a map of { normalized_key: reason }
  const conflicts: Record<string, string> = {};

  existingStudents.forEach((student) => {
    // Key by Name
    if (student.name) {
      conflicts[`name:${student.name.toLowerCase()}`] =
        "Student name already exists";
    }
    // Key by Email
    if (student.email) {
      conflicts[`email:${student.email.toLowerCase()}`] =
        "Student email already exists";
    }
  });

  return conflicts;
}

export async function bulkCreateStudentsAction(
  festivalId: string,
  students: {
    name: string;
    groupId: string;
    categoryId: string;
    gender?: string;
    email?: string;
    phone?: string;
    age?: number;
    standard?: string;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  // Check Limits (Pre-flight)
  const tierLimit = TIER_CONFIG[getResolvedTier(festival.tier)].limits.students;
  const currentCount = await prisma.student.count({ where: { festivalId } });

  if (currentCount + students.length > tierLimit) {
    return {
      success: false,
      successCount: 0,
      errors: [
        {
          name: "ALL",
          error: `Batch exceeds limit. You can add ${tierLimit - currentCount} more.`,
        },
      ],
    };
  }

  let successCount = 0;
  const errors: { name: string; error: string }[] = [];

  // We process sequentially to ensure ID generation (which depends on count) is correct.
  // In a real high-perf scenario, we would lock or reserve IDs, but this is sufficient.
  for (const student of students) {
    try {
      await StudentService.create(festivalId, {
        name: student.name,
        groupId: student.groupId,
        categoryId: student.categoryId,
        email: student.email,
        phone: student.phone,
        gender: (student.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
        age: student.age,
        standard: student.standard,
      });
      successCount++;
    } catch (error: unknown) {
      errors.push({
        name: student.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
  } catch {}

  return { success: true, successCount, errors };
}

// New action for hooks - uses StudentService
export async function deleteStudentWithServiceAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return StudentService.delete(id, festivalId);
}

export async function updateStudentAction(
  festivalId: string,
  id: string,
  data: {
    name?: string;
    groupId?: string;
    categoryId?: string;
    email?: string;
    phone?: string;
    gender?: string;

    age?: number;
    standard?: string;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return StudentService.update(id, festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender as any,

    age: data.age,
    standard: data.standard,
  });
}
