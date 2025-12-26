import {
  createProgramme,
  deleteProgramme,
  findProgrammesByEdition,
  findProgrammeById,
  updateProgramme,
  countProgrammes,
} from "@/server/models/programme.model";
import { findEditionById } from "@/server/models/edition.model";
import { findCategoryById } from "@/server/models/category.model";
import { Prisma } from "@prisma/client";

export const ProgrammeService = {
  async getAll(editionId: string, categoryId?: string) {
    return findProgrammesByEdition(editionId, categoryId);
  },

  async create(
    editionId: string,
    data: {
      categoryId: string;
      name: string;
      type: "INDIVIDUAL" | "GROUP";
      stageType: "STAGE" | "NON_STAGE";
      maxEntries?: number;
    },
  ) {
    // 1. Check Edition Status
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");
    if (edition.status === "FREEZE" || edition.status === "ARCHIVED") {
      throw new Error("Edition is frozen or archived");
    }

    // 2. Limit Check (Using maxEvents as proxy for Programmes for now)
    const limit = edition.limits?.maxEvents || 100;
    const count = await countProgrammes(editionId);
    if (count >= limit) {
      throw new Error(`Programme limit reached (${limit})`);
    }

    // 3. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.editionId !== editionId) {
      throw new Error("Invalid Category");
    }

    // 4. Create
    return createProgramme({
      edition: { connect: { id: editionId } },
      category: { connect: { id: data.categoryId } },
      name: data.name,
      type: data.type,
      stageType: data.stageType,
      maxEntries: data.maxEntries,
    });
  },

  async update(id: string, editionId: string, data: any) {
    const existing = await findProgrammeById(id);
    if (!existing || existing.editionId !== editionId) {
      throw new Error("Programme not found");
    }

    // Check Freeze
    const edition = await findEditionById(editionId);
    if (edition?.status === "FREEZE") throw new Error("Edition frozen");

    return updateProgramme(id, data);
  },

  async delete(id: string, editionId: string) {
    const existing = await findProgrammeById(id);
    if (!existing || existing.editionId !== editionId) {
      throw new Error("Programme not found");
    }

    // Check assignments
    const assignmentCount = (existing as any)._count?.assignments ?? 0;
    if (assignmentCount > 0) {
      throw new Error("Cannot delete programme with existing assignments");
    }

    return deleteProgramme(id);
  },
};
