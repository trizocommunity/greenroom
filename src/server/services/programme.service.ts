import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import { UsageCounterService } from "./usage-counter.service";
import {
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
      maxParticipantsPerGroup?: number;
      maxTeamsPerGroup?: number;
      maxStudentsPerTeam?: number;
      maxPoints?: number;
    },
  ) {
    // 1. Check Tier Limits & Increment
    await UsageCounterService.incrementUsage(festivalId, "programmes");

    try {
      // Replaced prisma.programme.create with existing createProgramme
      return await createProgramme({
        festival: { connect: { id: festivalId } },
        name: data.name,
        category: { connect: { id: data.categoryId } },
        type: data.type,
        stageType: data.stageType,
        maxParticipantsPerGroup: data.maxParticipantsPerGroup || 1,
        maxTeamsPerGroup: data.maxTeamsPerGroup || 1,
        maxStudentsPerTeam: data.maxStudentsPerTeam || 1,
      });
    } catch (error) {
      // Rollback usage on error
      // UsageCounterService validation happens before create.
      // If create fails, we technically skewed the counter.
      // Ideally wrap in transaction or decrement.
      // For now, simpler to leave as is or basic try/catch rollback
      // To keep it robust without big refactor:
      await UsageCounterService.incrementUsage(
        festivalId,
        "programmes",
        -1,
      ).catch(() => {});
      throw error;
    }
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
      maxParticipantsPerGroup?: number;
      maxTeamsPerGroup?: number;
      maxStudentsPerTeam?: number;
    }[],
  ) {
    // Replaced prisma.festival.findUnique with existing findFestivalById
    const festival = await findFestivalById(festivalId);

    if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

    await UsageCounterService.incrementUsage(
      festivalId,
      "programmes",
      programmes.length,
    );

    try {
      // Convert to Prisma CreateMany Input
      const data = programmes.map((p) => ({
        festivalId,
        name: p.name,
        categoryId: p.categoryId,
        type: p.type,
        stageType: p.stageType,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup || 1,
        maxTeamsPerGroup: p.maxTeamsPerGroup || 1,
        maxStudentsPerTeam: p.maxStudentsPerTeam || 1,
      }));

      return await prisma.programme.createMany({
        data,
      });
    } catch (error) {
      await UsageCounterService.incrementUsage(
        festivalId,
        "programmes",
        -programmes.length,
      ).catch(() => {});
      throw error;
    }
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
      maxParticipantsPerGroup?: number;
      maxTeamsPerGroup?: number;
      maxStudentsPerTeam?: number;
      maxPoints?: number;
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
      maxParticipantsPerGroup: data.maxParticipantsPerGroup,
      maxTeamsPerGroup: data.maxTeamsPerGroup,
      maxStudentsPerTeam: data.maxStudentsPerTeam,
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

    await UsageCounterService.incrementUsage(
      festivalId,
      "programmes",
      -1,
    ).catch(() => {});

    return deleteProgramme(id);
  },
};
