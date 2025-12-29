import { Prisma, Tier } from "@prisma/client";
import { findCategoryById } from "@/server/models/category.model";
import { findFestivalById } from "@/server/models/festival.model";
import {
  countProgrammes,
  createProgramme,
  deleteProgramme,
  findProgrammeById,
  findProgrammesByFestival,
  updateProgramme,
} from "@/server/models/programme.model";
import { TIER_CONFIG } from "@/config/pricing";

export const ProgrammeService = {
  async getAll(festivalId: string, categoryId?: string) {
    return findProgrammesByFestival(festivalId, categoryId);
  },

  async create(
    festivalId: string,
    data: {
      categoryId: string;
      name: string;
      type: "INDIVIDUAL" | "GROUP";
      stageType: "STAGE" | "NON_STAGE";
      maxEntries?: number;
      maxTeamSize?: number;
    },
  ) {
    // 1. Check Festival Status
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new Error("Festival not found");
    // Only block if EXPIRED? Or should we block editing if locked? Assuming EXPIRED block for now.
    if (festival.status === "EXPIRED") {
      throw new Error("Festival is expired");
    }

    // 2. Limit Check (Using maxEvents)
    const limit = TIER_CONFIG[festival.tier || Tier.STANDARD].limits.events;
    const count = await countProgrammes(festivalId);
    if (count >= limit) {
      throw new Error(`Programme limit reached (${limit})`);
    }

    // 3. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.festivalId !== festivalId) {
      throw new Error("Invalid Category");
    }

    // 4. Create
    return createProgramme({
      festival: { connect: { id: festivalId } },
      category: { connect: { id: data.categoryId } },
      name: data.name,
      type: data.type,
      stageType: data.stageType,
      maxEntries: data.maxEntries,
      maxTeamSize: data.maxTeamSize || 1,
    });
  },

  async update(id: string, festivalId: string, data: any) {
    const existing = await findProgrammeById(id);
    if (!existing || existing.festivalId !== festivalId) {
      throw new Error("Programme not found");
    }

    // Check Status
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    return updateProgramme(id, data);
  },

  async delete(id: string, festivalId: string) {
    const existing = await findProgrammeById(id);
    if (!existing || existing.festivalId !== festivalId) {
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
