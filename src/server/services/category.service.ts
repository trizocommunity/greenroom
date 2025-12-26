import {
  createCategory,
  deleteCategory,
  findCategoriesByEdition,
  findCategoryById,
  updateCategory,
  countCategories,
} from "@/server/models/category.model";
import { findEditionById } from "@/server/models/edition.model";
import { Prisma } from "@prisma/client";

// Hardcoded limits if not in DB (Phase 1)
const TIER_LIMITS = {
  BASIC: { categories: 5 },
  STANDARD: { categories: 10 },
  PRO: { categories: 50 },
};

export const CategoryService = {
  async getAll(editionId: string) {
    return findCategoriesByEdition(editionId);
  },

  async create(
    editionId: string,
    data: { name: string; description?: string },
  ) {
    // 1. Check Edition Status
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");
    if (edition.status === "FREEZE" || edition.status === "ARCHIVED") {
      throw new Error("Edition is frozen or archived");
    }

    // 2. Check Tier Limits
    const count = await countCategories(editionId);
    const limit = TIER_LIMITS[edition.tier || "STANDARD"].categories; // Fallback to STANDARD
    if (count >= limit) {
      throw new Error(
        `Category limit reached for ${edition.tier} tier (${limit})`,
      );
    }

    // 3. Create
    // 3. Create
    return createCategory({
      edition: { connect: { id: editionId } },
      name: data.name,
      description: data.description,
    });
  },

  async update(
    id: string,
    editionId: string,
    data: { name?: string; description?: string },
  ) {
    // 1. Check Edition Status (and existence)
    const edition = await findEditionById(editionId);
    if (edition?.status === "FREEZE" || edition?.status === "ARCHIVED") {
      throw new Error("Edition is frozen or archived");
    }

    // Verify ownership/isolation
    const existing = await findCategoryById(id);
    if (!existing || existing.editionId !== editionId) {
      throw new Error("Category not found in this edition");
    }

    return updateCategory(id, data);
  },

  async delete(id: string, editionId: string) {
    const existing = await findCategoryById(id);
    if (!existing || existing.editionId !== editionId) {
      throw new Error("Category not found in this edition");
    }

    // Check constraints: Cannot delete if Programmes exist
    // Prisma query in findCategoryById includes _count
    const progCount = (existing as any)._count?.programmes ?? 0;
    if (progCount > 0) {
      throw new Error("Cannot delete category with existing programmes");
    }

    return deleteCategory(id);
  },
};
