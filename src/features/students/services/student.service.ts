import { and, count, eq, ilike, ne } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { student as students } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { generateProfileSlug } from "@/core/utils/slug";
import { findCategoryById } from "@/features/categories/repositories/category.repository";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { findGroupById } from "@/features/groups/repositories/group.repository";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import {
  createStudent,
  deleteStudent,
  findStudentById,
  findStudentsByFestival,
  updateStudent,
} from "@/features/students/repositories/student.repository";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";

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

    // Enforce no duplicate student names in the same festival
    const existingByName = await db.query.student.findFirst({
      where: and(
        eq(students.festivalId, festivalId),
        ilike(students.name, normalizedName),
      ),
      columns: { id: true },
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
    const [{ studentCount }] = await db
      .select({ studentCount: count() })
      .from(students)
      .where(eq(students.festivalId, festivalId));

    const tierLimit =
      TIER_CONFIG[getResolvedTier(festival.tier)].limits.students;
    if (studentCount >= tierLimit) {
      throw new AppError(ERROR_MESSAGES.STUDENT_LIMIT_REACHED);
    }

    await UsageCounterService.incrementUsage(festivalId, "students", 1);

    // 4. Create (no profileSlug yet — set after we have id)
    const created = await createStudent({
      festivalId,
      groupId: data.groupId,
      categoryId: data.categoryId,
      name: normalizedName,
      gender: data.gender ?? "MALE",
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
    let slugExists = await db.query.student.findFirst({
      where: and(
        eq(students.festivalId, festivalId),
        eq(students.profileSlug, profileSlug),
      ),
      columns: { id: true },
    });
    let suffix = 2;
    while (slugExists) {
      profileSlug = `${generateProfileSlug(created.name, created.id, created.chestNumber)}-${suffix}`;
      slugExists = await db.query.student.findFirst({
        where: and(
          eq(students.festivalId, festivalId),
          eq(students.profileSlug, profileSlug),
        ),
        columns: { id: true },
      });
      suffix++;
    }

    return updateStudent(created.id, { profileSlug });
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
      const existingByName = await db.query.student.findFirst({
        where: and(
          eq(students.festivalId, festivalId),
          ilike(students.name, normalizedName),
          ne(students.id, id),
        ),
        columns: { id: true },
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
      const baseSlug = generateProfileSlug(
        newName,
        existing.id,
        existing.chestNumber,
      );
      profileSlug = baseSlug;
      let slugExists = await db.query.student.findFirst({
        where: and(
          eq(students.festivalId, festivalId),
          eq(students.profileSlug, profileSlug),
          ne(students.id, id),
        ),
        columns: { id: true },
      });
      let suffix = 2;
      while (slugExists) {
        profileSlug = `${baseSlug}-${suffix}`;
        slugExists = await db.query.student.findFirst({
          where: and(
            eq(students.festivalId, festivalId),
            eq(students.profileSlug, profileSlug),
            ne(students.id, id),
          ),
          columns: { id: true },
        });
        suffix++;
      }
    }

    return updateStudent(id, {
      name: data.name,
      groupId: data.groupId,
      categoryId: data.categoryId,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      age: data.age,
      standard: data.standard,
      profileSlug: profileSlug ?? undefined,
    });
  },

  async delete(id: string, festivalId: string) {
    const exists = await findStudentById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);

    await UsageCounterService.incrementUsage(festivalId, "students", -1);

    return deleteStudent(id);
  },
};
