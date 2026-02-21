import { Tier } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import {
  countCategories,
  createCategory,
  deleteCategory,
  findCategoriesByFestival,
  findCategoryById,
  updateCategory,
} from "@/server/models/category.model";
import { findFestivalById } from "@/server/models/festival.model";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const CategoryService = {
  async getAll(festivalId: string) {
    return findCategoriesByFestival(festivalId);
  },

  async create(
    festivalId: string,
    data: {
      name: string;
      description?: string;
      type?: "SINGLE" | "GENERAL";
    },
  ) {
    // 1. Check Festival Status
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.status === "EXPIRED") {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);
    }

    // 2. Check Tier Limits — use TIER_CONFIG as single source of truth
    const count = await countCategories(festivalId);
    const tierConfig = TIER_CONFIG[festival.tier ?? Tier.STANDARD];
    const limit = tierConfig.limits.categories;
    if (count >= limit) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_LIMIT_REACHED);
    }

    // 3. Create
    return createCategory({
      festival: { connect: { id: festivalId } },
      name: data.name,
      description: data.description,
      type: data.type || "SINGLE",
    });
  },

  async update(
    id: string,
    festivalId: string,
    data: {
      name?: string;
      description?: string;
      type?: "SINGLE" | "GENERAL";
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);
    }

    const existing = await findCategoryById(id);
    if (!existing || existing.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }

    return updateCategory(id, data);
  },

  async delete(id: string, festivalId: string) {
    const existing = await findCategoryById(id);
    if (!existing || existing.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }

    // QA-6 fix: explicit count query instead of (existing as any)._count
    const progCount = await prisma.programme.count({
      where: { categoryId: id },
    });
    if (progCount > 0) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_HAS_PROGRAMMES);
    }

    return deleteCategory(id);
  },
};
