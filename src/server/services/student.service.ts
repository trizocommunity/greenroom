import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { generateProfileSlug } from "@/lib/slug";
import { getResolvedTier } from "@/lib/tier";
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
    const normalizedName = data.name.trim();
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    // Enforce "no duplicate student names in the same festival"
    const existingByName = await prisma.student.findFirst({
      where: {
        festivalId,
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingByName) {
      throw new AppError(ERROR_MESSAGES.STUDENT_NAME_DUPLICATE);
    }

    // 1. Group Validation
    const group = await findGroupById(data.groupId);
    if (!group || group.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.STUDENT_INVALID_GROUP);

    // 2. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.STUDENT_INVALID_CATEGORY);

    // 3. Limit Check & Increment (Atomic)
    const count = await prisma.student.count({
      where: { festivalId },
    });

    const tierLimit =
      TIER_CONFIG[getResolvedTier(festival.tier)].limits.students;
    if (count >= tierLimit) {
      throw new AppError(ERROR_MESSAGES.STUDENT_LIMIT_REACHED);
    }

    await UsageCounterService.incrementUsage(festivalId, "students", 1);

    // 4. Create (no profileSlug yet — set after we have id)
    const created = await createStudent({
      festival: { connect: { id: festivalId } },
      group: { connect: { id: data.groupId } },
      category: { connect: { id: data.categoryId } },
      name: normalizedName,
      gender: data.gender,
      email: data.email || undefined,
      phone: data.phone,
      age: data.age,
      standard: data.standard,
    });

    // 5. Set unique profileSlug for public URL /{festivalSlug}/{profileSlug}
    let profileSlug = generateProfileSlug(
      created.name,
      created.id,
      created.chestNumber,
    );
    let exists = await prisma.student.findFirst({
      where: { festivalId, profileSlug },
    });
    let suffix = 2;
    while (exists) {
      profileSlug = `${generateProfileSlug(created.name, created.id, created.chestNumber)}-${suffix}`;
      exists = await prisma.student.findFirst({
        where: { festivalId, profileSlug },
      });
      suffix++;
    }
    await prisma.student.update({
      where: { id: created.id },
      data: { profileSlug },
    });
    return prisma.student.findUnique({
      where: { id: created.id },
      include: { category: true, group: true },
    }) as Promise<typeof created>;
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
      throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);

    if (data.name) {
      const normalizedName = data.name.trim();
      const existingByName = await prisma.student.findFirst({
        where: {
          festivalId,
          name: { equals: normalizedName, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

      if (existingByName) {
        throw new AppError(ERROR_MESSAGES.STUDENT_NAME_DUPLICATE);
      }
    }

    if (data.groupId) {
      const group = await findGroupById(data.groupId);
      if (!group || group.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.STUDENT_INVALID_GROUP);
    }
    if (data.categoryId) {
      const category = await findCategoryById(data.categoryId);
      if (!category || category.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.STUDENT_INVALID_CATEGORY);
    }

    // Update profileSlug if Name changes
    let profileSlug = existing.profileSlug;
    if (data.name && data.name.trim() !== existing.name) {
      const newName = data.name.trim();
      profileSlug = generateProfileSlug(
        newName,
        existing.id,
        existing.chestNumber,
      );
      let exists = await prisma.student.findFirst({
        where: { festivalId, profileSlug, NOT: { id } },
      });
      let suffix = 2;
      const baseSlug = generateProfileSlug(
        newName,
        existing.id,
        existing.chestNumber,
      );
      while (exists) {
        profileSlug = `${baseSlug}-${suffix}`;
        exists = await prisma.student.findFirst({
          where: { festivalId, profileSlug, NOT: { id } },
        });
        suffix++;
      }
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
        profileSlug,
      },
    });
  },

  async delete(id: string, festivalId: string) {
    const exists = await findStudentById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);

    // Decrement usage counter
    await UsageCounterService.incrementUsage(festivalId, "students", -1);

    return deleteStudent(id);
  },
};
