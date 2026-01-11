"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIER_CONFIG } from "@/config/pricing";
// New action for hooks - uses StudentService
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { StudentService } from "@/server/services/student.service";

export async function getStudentsAction(festivalId: string) {
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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  // Check Limits (Pre-flight)
  const tierLimit = TIER_CONFIG[festival.tier || "STANDARD"].limits.students;
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
    } catch (error: any) {
      errors.push({
        name: student.name,
        error: error.message || "Unknown error",
      });
    }
  }

  try {
    revalidatePath(`/festival/${festivalId}`);
  } catch {}

  return { success: true, successCount, errors };
}

// New action for hooks - uses StudentService
export async function deleteStudentWithServiceAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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

// Legacy action using FormData - kept for backwards compatibility
const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  festivalId: z.string().min(1, "Festival ID is required"),
  groupId: z.string().optional(),
  categoryId: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
});

export async function createStudentAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    festivalId: formData.get("festivalId"),
    groupId: formData.get("groupId"),
    categoryId: formData.get("categoryId"),
    gender: formData.get("gender"),
  };

  const validated = createStudentSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { name, email, phone, festivalId, groupId, categoryId, gender } =
    validated.data;

  try {
    // Transaction to enforce limit and atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Festival count & Limit
      const festival = await tx.festival.findUnique({
        where: { id: festivalId },
      });

      if (!festival) {
        throw new Error("Festival not found");
      }

      // TODO: Check festival status if needed
      // if (festival.status !== "ACTIVE") { ... }

      // Hardcoded limit for now or fetch from structure
      const limit = 1000;
      const currentCount = festival.studentsCount;

      if (currentCount >= limit) {
        throw new Error("Student limit reached for this festival.");
      }

      // 2. Create Student
      if (email) {
        const existing = await tx.student.findFirst({
          where: { festivalId, email },
        });

        if (existing) {
          throw new Error(
            "This email is already registered for this festival.",
          );
        }
      }

      let finalGroupId = groupId;
      let finalCategoryId = categoryId;

      if (!finalGroupId) {
        // Try to find a default group or creating one?
        // For now, fail if not provided, unless we find *any* group.
        const defaultGroup = await tx.group.findFirst({
          where: { festivalId },
        });
        if (defaultGroup) finalGroupId = defaultGroup.id;
        else throw new Error("No group specified and no default group found.");
      }

      if (!finalCategoryId) {
        const defaultCat = await tx.category.findFirst({
          where: { festivalId },
        });
        if (defaultCat) finalCategoryId = defaultCat.id;
        else
          throw new Error(
            "No category specified and no default category found.",
          );
      }

      await tx.student.create({
        data: {
          festival: { connect: { id: festivalId } },
          group: { connect: { id: finalGroupId } },
          category: { connect: { id: finalCategoryId } },
          name,
          email,
          phone,
          gender: gender as any,
        },
      });

      // 3. Increment Count
      await tx.festival.update({
        where: { id: festivalId },
        data: {
          studentsCount: { increment: 1 },
        },
      });

      return { success: true };
    });

    try {
      // Revalidate festival dashboard
      revalidatePath(`/festival/${festivalId}`);
    } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error("Failed to register student:", error);
    return { error: error.message || "Failed to register student" };
  }
}

export async function deleteStudentAction(
  studentId: string,
  festivalId: string,
) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: { id: studentId },
      });

      await tx.festival.update({
        where: { id: festivalId },
        data: {
          studentsCount: { decrement: 1 },
        },
      });
    });

    try {
      revalidatePath(`/festival/${festivalId}`);
    } catch {}
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete student" };
  }
}
