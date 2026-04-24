import { db } from "@/lib/db";
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
import { programme as programmes, programmeAssignment } from "../db/schema";
import { eq, count } from "drizzle-orm";
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
        festivalId,
        name: data.name,
        categoryId: data.categoryId,
        type: data.type,
        stageType: data.stageType,
        maxParticipantsPerGroup: data.maxParticipantsPerGroup || 1,
        maxTeamsPerGroup: data.maxTeamsPerGroup || 1,
        maxStudentsPerTeam: data.maxStudentsPerTeam || 1,
      });
    } catch (error) {
      await UsageCounterService.incrementUsage(
        festivalId,
        "programmes",
        -1,
      ).catch(() => {});
      throw error;
    }
  },

  async bulkCreate(
    festivalId: string,
    programmeList: {
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
      programmeList.length,
    );

    try {
      const { randomUUID } = await import("crypto");
      const now = new Date().toISOString();
      const data = programmeList.map((p) => ({
        id: randomUUID(),
        updatedAt: now,
        festivalId,
        name: p.name,
        categoryId: p.categoryId,
        type: p.type,
        stageType: p.stageType,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup || 1,
        maxTeamsPerGroup: p.maxTeamsPerGroup || 1,
        maxStudentsPerTeam: p.maxStudentsPerTeam || 1,
      }));

      return await db.insert(programmes).values(data).returning();
    } catch (error) {
      await UsageCounterService.incrementUsage(
        festivalId,
        "programmes",
        -programmeList.length,
      ).catch(() => {});
      throw error;
    }
  },

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
    await this.getDetails(id, festivalId);

    return updateProgramme(id, {
      name: data.name,
      categoryId: data.categoryId,
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

    const [{ assignmentCount }] = await db
      .select({ assignmentCount: count() })
      .from(programmeAssignment)
      .where(eq(programmeAssignment.programmeId, id));

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
