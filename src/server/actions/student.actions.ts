"use server";

import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { StudentService } from "@/server/services/student.service";
import { assignChestNumberForNewStudent } from "@/server/actions/chest-number.actions";

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

  // Validate Dependencies
  const [groupCount, categoryCount] = await Promise.all([
    prisma.group.count({ where: { festivalId } }),
    prisma.category.count({ where: { festivalId } }),
  ]);

  if (groupCount === 0 || categoryCount === 0) {
    throw new Error("Create groups & categories first.");
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
    revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
  } catch {}
  return newStudent;
}

export async function validateStudentsAction(
  festivalId: string,
  candidates: { name: string; email?: string }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

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

/** Export students list as Excel; gated by excelExport feature (STANDARD+). */
export async function exportStudentsToExcelAction(festivalId: string): Promise<
  | { success: true; data: string; filename: string }
  | { success: false; error: string }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: ERROR_MESSAGES.FESTIVAL_NOT_FOUND };

  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier),
      "excelExport",
    )
  ) {
    return {
      success: false,
      error: "Excel export is not available on your plan. Upgrade to export.",
    };
  }

  const students = await prisma.student.findMany({
    where: { festivalId },
    include: { group: true, category: true },
    orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
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
