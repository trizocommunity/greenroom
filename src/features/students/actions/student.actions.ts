"use server";

import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  student as studentTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import { assignChestNumberForNewStudent } from "@/features/students/actions/chest-number.actions";
import { StudentService } from "@/features/students/services/student.service";

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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const [groupCountResult] = await db
    .select({ c: count() })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festivalId));

  const [categoryCountResult] = await db
    .select({ c: count() })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festivalId));

  if (groupCountResult.c === 0 || categoryCountResult.c === 0) {
    throw new AppError(
      "Create groups and categories before adding students.",
      "GROUPS_OR_CATEGORIES_MISSING",
    );
  }

  const newStudent = await StudentService.create(festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: (data.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
    age: data.age,
    standard: data.standard,
  });
  await assignChestNumberForNewStudent(festivalId, newStudent.id);
  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/students`);
  } catch {}
  return newStudent;
}

export async function validateStudentsAction(
  festivalId: string,
  candidates: {
    name: string;
    email?: string;
    categoryId: string;
    groupId: string;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  if (candidates.length === 0) return {};

  const emails = candidates
    .map((c) => c.email?.trim().toLowerCase())
    .filter((e): e is string => !!e);

  // Build conditions for name checks (global across groups/categories)
  const nameConditions = candidates
    .filter((c) => c.name)
    .map((c) =>
      eq(sql`LOWER(${studentTable.name})`, c.name.trim().toLowerCase()),
    );

  const conditions = [];
  if (emails.length > 0) conditions.push(inArray(studentTable.email, emails));
  if (nameConditions.length > 0) conditions.push(or(...nameConditions));

  const existingStudents = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festivalId), or(...conditions)),
    columns: { name: true, email: true },
  });

  const conflicts: Record<string, string> = {};
  existingStudents.forEach((s) => {
    if (s.email) {
      const emailMatch = emails.find((e) => e === s.email?.toLowerCase());
      if (emailMatch) {
        conflicts[`email:${s.email.toLowerCase()}`] = "Email already exists";
      }
    }

    const nameMatch = candidates.find(
      (c) => c.name.trim().toLowerCase() === s.name.toLowerCase(),
    );
    if (nameMatch) {
      conflicts[`name:${s.name.toLowerCase()}`] =
        "A student with this name already exists in the festival";
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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const tierLimit =
    TIER_CONFIG[getResolvedTier(festival.tier as any)].limits.students;
  const [currentCountResult] = await db
    .select({ c: count() })
    .from(studentTable)
    .where(eq(studentTable.festivalId, festivalId));

  if (currentCountResult.c + students.length > tierLimit) {
    return {
      success: false,
      successCount: 0,
      errors: [
        {
          name: "ALL",
          error: `Batch exceeds limit. You can add ${tierLimit - currentCountResult.c} more.`,
        },
      ],
    };
  }

  let successCount = 0;
  const errors: { name: string; error: string }[] = [];

  for (const student of students) {
    try {
      const newStudent = await StudentService.create(festivalId, {
        name: student.name,
        groupId: student.groupId,
        categoryId: student.categoryId,
        email: student.email,
        phone: student.phone,
        gender: (student.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
        age: student.age,
        standard: student.standard,
      });
      await assignChestNumberForNewStudent(festivalId, newStudent.id);
      successCount++;
    } catch (error: unknown) {
      errors.push({
        name: student.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/students`);
  } catch {}

  return { success: true, successCount, errors };
}

export async function deleteStudentWithServiceAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const result = await StudentService.delete(id, festivalId);
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/students`);
  }
  return result;
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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const result = await StudentService.update(id, festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender as any,
    age: data.age,
    standard: data.standard,
  });
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/students`);
  }
  return result;
}

export async function exportStudentsToExcelAction(
  festivalId: string,
): Promise<
  | { success: true; data: string; filename: string }
  | { success: false; error: string }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival)
    return { success: false, error: ERROR_MESSAGES.FESTIVAL_NOT_FOUND };

  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier as any),
      "excelExport",
    )
  ) {
    return {
      success: false,
      error: "Excel export is not available on your plan. Upgrade to export.",
    };
  }

  const students = await db.query.student.findMany({
    where: eq(studentTable.festivalId, festivalId),
    with: { group: true, category: true },
    orderBy: [asc(sql`group.name`), asc(studentTable.name)], // This might need careful check on group.name sort
  });

  const XLSX = await import("xlsx");
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Group",
    "Category",
    "Chest Number",
    "Gender",
    "Age",
    "Standard",
  ];
  const rows = students.map((s) => [
    s.name ?? "",
    s.email ?? "",
    s.phone ?? "",
    s.group?.name ?? "",
    s.category?.name ?? "",
    s.chestNumber ?? "",
    s.gender ?? "",
    s.age ?? "",
    s.standard ?? "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const base64 = buf.toString("base64");
  const filename = `students_${festival.slug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { success: true, data: base64, filename };
}
