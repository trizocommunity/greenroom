import { Prisma, Tier } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
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

export const ProgrammeService = {
  async getAll(festivalId: string, categoryId?: string) {
    return findProgrammesByFestival(festivalId, categoryId);
  },

  async getDetails(id: string, festivalId: string) {
    // Import helper here to avoid circular dep if any, or just plain import at top
    const { findProgrammeWithAssignments } = await import(
      "@/server/models/programme.model"
    );
    const programme = await findProgrammeWithAssignments(id);
    if (!programme || programme.festivalId !== festivalId) {
      throw new Error("Programme not found");
    }
    return programme;
  },

  /*
   * CREATE Programme
   */
  async create(
    festivalId: string,
    data: {
      name: string;
      categoryId: string;
      type: "INDIVIDUAL" | "GROUP";
      stageType: "STAGE" | "NON_STAGE";
      maxEntries?: number;
      maxTeamSize?: number;
    },
  ) {
    // 1. Check Tier Limits
    // Replaced prisma.festival.findUnique with existing findFestivalById
    const festival = await findFestivalById(festivalId);

    if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

    const tierLimit = TIER_CONFIG[festival.tier || Tier.STANDARD].limits.events; // "events" = programmes
    // Replaced prisma.programme.count with existing countProgrammes
    const currentCount = await countProgrammes(festivalId);

    if (currentCount >= tierLimit) {
      throw new Error(
        `Programme limit reached for this tier (${tierLimit}). Upgrade to add more.`,
      );
    }

    // Replaced prisma.programme.create with existing createProgramme
    return createProgramme({
      festival: { connect: { id: festivalId } },
      name: data.name,
      category: { connect: { id: data.categoryId } },
      type: data.type,
      stageType: data.stageType,
      maxEntries: data.maxEntries || 1, // Default to 1
      maxTeamSize: data.type === "INDIVIDUAL" ? 1 : data.maxTeamSize || 1, // Force 1 for individual
    });
  },

  /*
   * BULK CREATE Programmes
   */
  async bulkCreate(
    festivalId: string,
    programmes: {
      name: string;
      categoryId: string;
      type: "INDIVIDUAL" | "GROUP";
      stageType: "STAGE" | "NON_STAGE";
      maxEntries?: number;
      maxTeamSize?: number;
    }[],
  ) {
    // Replaced prisma.festival.findUnique with existing findFestivalById
    const festival = await findFestivalById(festivalId);

    if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

    const tierLimit = TIER_CONFIG[festival.tier || Tier.STANDARD].limits.events;
    // Replaced prisma.programme.count with existing countProgrammes
    const currentCount = await countProgrammes(festivalId);

    if (currentCount + programmes.length > tierLimit) {
      throw new Error(
        `Bulk upload exceeds limit. You can add ${tierLimit - currentCount} more programmes.`,
      );
    }

    // Convert to Prisma CreateMany Input
    const data = programmes.map((p) => ({
      festivalId,
      name: p.name,
      categoryId: p.categoryId,
      type: p.type,
      stageType: p.stageType,
      maxEntries: p.maxEntries || 1,
      maxTeamSize: p.type === "INDIVIDUAL" ? 1 : p.maxTeamSize || 1,
    }));

    return prisma.programme.createMany({
      data,
    });
  },

  /*
   * UPDATE Programme
   */
  async update(
    id: string,
    festivalId: string,
    data: {
      name?: string;
      categoryId?: string;
      type?: "INDIVIDUAL" | "GROUP";
      stageType?: "STAGE" | "NON_STAGE";
      maxEntries?: number;
      maxTeamSize?: number;
    },
  ) {
    // Verify ownership via getDetails (throws if not found)
    const programme = await this.getDetails(id, festivalId);

    // Replaced prisma.programme.update with existing updateProgramme
    return updateProgramme(id, {
      name: data.name,
      category: data.categoryId
        ? { connect: { id: data.categoryId } }
        : undefined,
      type: data.type,
      stageType: data.stageType,
      maxEntries: data.maxEntries,
    });
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
