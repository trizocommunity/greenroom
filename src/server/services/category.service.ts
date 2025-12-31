import { Prisma, Tier } from "@prisma/client";
import {
  countCategories,
  createCategory,
  deleteCategory,
  findCategoriesByFestival,
  findCategoryById,
  updateCategory,
} from "@/server/models/category.model";
import { findFestivalById } from "@/server/models/festival.model";

// Hardcoded limits for categories based on Tier
const TIER_CATEGORY_LIMITS = {
  [Tier.BASIC]: 5,
  [Tier.STANDARD]: 10,
  [Tier.PRO]: 50,
};

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
    if (!festival) throw new Error("Festival not found");
    if (festival.status === "EXPIRED") {
      throw new Error("Festival is expired");
    }

    // 2. Check Tier Limits
    const count = await countCategories(festivalId);
    const limit = TIER_CATEGORY_LIMITS[festival.tier || Tier.STANDARD];
    if (count >= limit) {
      throw new Error(
        `Category limit reached for ${festival.tier} tier (${limit})`,
      );
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
    // 1. Check Festival Status
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") {
      throw new Error("Festival is expired");
    }

    // Verify ownership/isolation
    const existing = await findCategoryById(id);
    if (!existing || existing.festivalId !== festivalId) {
      throw new Error("Category not found in this festival");
    }

    return updateCategory(id, data);
  },

  async delete(id: string, festivalId: string) {
    const existing = await findCategoryById(id);
    if (!existing || existing.festivalId !== festivalId) {
      throw new Error("Category not found in this festival");
    }

    // Check constraints: Cannot delete if Programmes exist
    const progCount = (existing as any)._count?.programmes ?? 0;
    if (progCount > 0) {
      throw new Error("Cannot delete category with existing programmes");
    }

    return deleteCategory(id);
  },
};
