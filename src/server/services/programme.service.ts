import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import {
  createProgramme,
  deleteProgramme,
  findProgrammeById,
  findProgrammesByFestival,
  findProgrammeWithAssignments,
  updateProgramme,
} from "@/server/models/programme.model";
import { UsageCounterService } from "./usage-counter.service";

export const ProgrammeService = {
  async getAll(festivalId: string, categoryId?: string) {
    return findProgrammesByFestival(festivalId, categoryId);
  },

  async getDetails(id: string, festivalId: string) {
    const programme = await findProgrammeWithAssignments(id);
    if (!programme || programme.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
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
    await UsageCounterService.incrementUsage(festivalId, "programmes");

    try {
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
      // Rollback usage counter on create failure
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
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

    await UsageCounterService.incrementUsage(
      festivalId,
      "programmes",
      programmes.length,
    );

    try {
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

      return await prisma.programme.createMany({ data });
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
    // Verify existence — throws PROGRAMME_NOT_FOUND if missing
    await this.getDetails(id, festivalId);

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
      throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    }

    // QA-6 fix: explicit count instead of (existing as any)._count
    const assignmentCount = await prisma.programmeAssignment.count({
      where: { programmeId: id },
    });
    if (assignmentCount > 0) {
      throw new AppError(ERROR_MESSAGES.PROGRAMME_HAS_ASSIGNMENTS);
    }

    await UsageCounterService.incrementUsage(
      festivalId,
      "programmes",
      -1,
    ).catch(() => {});

    return deleteProgramme(id);
  },
};
