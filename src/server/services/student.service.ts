import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";
import { findCategoryById } from "@/server/models/category.model";
import { findFestivalById } from "@/server/models/festival.model";
import { findGroupById } from "@/server/models/group.model";
import {
  createStudent,
  deleteStudent,
  findStudentById,
  findStudentsByFestival,
} from "@/server/models/student.model";
import { UsageCounterService } from "./usage-counter.service";

export const StudentService = {
  async getAll(festivalId: string, groupId?: string) {
    return findStudentsByFestival(festivalId, groupId);
  },

  async create(
    festivalId: string,
    data: {
      name: string;
      email?: string;
      phone?: string;
      groupId: string;
      categoryId: string;
      gender?: "MALE" | "FEMALE" | "OTHER";

      age?: number;
      standard?: string;
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new Error("Festival not found");
    if (festival.status === "EXPIRED") throw new Error("Festival expired");

    // 1. Group Validation
    const group = await findGroupById(data.groupId);
    if (!group || group.festivalId !== festivalId)
      throw new Error("Invalid Group");

    // 2. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.festivalId !== festivalId)
      throw new Error("Invalid Category");

    // 3. Limit Check & Increment (Atomic)
    const count = await prisma.student.count({
      where: { festivalId },
    });

    // Import TIER_CONFIG and Tier type if not at top of file, or assume imports added
    // Check Limit
    const tierLimit = TIER_CONFIG[festival.tier || "STANDARD"].limits.students;
    if (count >= tierLimit) {
      throw new Error(
        `Student limit reached for this tier (${tierLimit}). Upgrade to add more.`,
      );
    }

    await UsageCounterService.incrementUsage(festivalId, "students", 1);

    // 5. Create
    // TODO: Handle Decrement usage counter on failure if needed (not implemented yet)
    return await createStudent({
      festival: { connect: { id: festivalId } },
      group: { connect: { id: data.groupId } },
      category: { connect: { id: data.categoryId } },
      name: data.name,
      gender: data.gender,
      email: data.email || undefined,
      phone: data.phone,

      age: data.age,
      standard: data.standard,
    });
  },

  async update(
    id: string,
    festivalId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      groupId?: string;
      categoryId?: string;
      gender?: "MALE" | "FEMALE" | "OTHER";

      age?: number;
      standard?: string;
    },
  ) {
    const existing = await findStudentById(id);
    if (!existing || existing.festivalId !== festivalId)
      throw new Error("Student not found");

    // Optional: Validate group/category if they are changing
    // We assume IDs are valid for now or rely on Foreign Key constraints?
    // Better to check if provided.
    if (data.groupId) {
      const group = await findGroupById(data.groupId);
      if (!group || group.festivalId !== festivalId)
        throw new Error("Invalid Group");
    }
    if (data.categoryId) {
      const category = await findCategoryById(data.categoryId);
      if (!category || category.festivalId !== festivalId)
        throw new Error("Invalid Category");
    }

    return prisma.student.update({
      where: { id },
      data: {
        name: data.name,
        groupId: data.groupId,
        categoryId: data.categoryId,
        email: data.email,
        phone: data.phone,
        gender: data.gender,

        age: data.age,
        standard: data.standard,
      },
    });
  },

  async delete(id: string, festivalId: string) {
    const exists = await findStudentById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new Error("Student not found");

    // Decrement usage counter
    await UsageCounterService.incrementUsage(festivalId, "students", -1);

    return deleteStudent(id);
  },
};
