import { count, eq } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { programme as programmes } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import {
  countCategories,
  createCategory,
  deleteCategory,
  findCategoriesByFestival,
  findCategoryById,
  updateCategory,
} from "@/features/categories/repositories/category.repository";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { getResolvedTier } from "@/features/plan-features/services/tier";

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

    // 2. Check Tier Limits
    const categoryCount = await countCategories(festivalId);
    const tierConfig = TIER_CONFIG[getResolvedTier(festival.tier)];
    const limit = tierConfig.limits.categories;
    if (categoryCount >= limit) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_LIMIT_REACHED);
    }

    // 3. Create
    return createCategory({
      festivalId,
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

    const [{ progCount }] = await db
      .select({ progCount: count() })
      .from(programmes)
      .where(eq(programmes.categoryId, id));

    if (progCount > 0) {
      throw new AppError(ERROR_MESSAGES.CATEGORY_HAS_PROGRAMMES);
    }

    return deleteCategory(id);
  },
};
