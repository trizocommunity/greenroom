"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
    registrationNumber?: string;
  },
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  return StudentService.create(festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: (data.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
    registrationNumber: data.registrationNumber,
  });
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
    registrationNumber?: string;
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
    registrationNumber: data.registrationNumber,
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
