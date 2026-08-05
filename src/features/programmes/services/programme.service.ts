import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment,
  programme as programmes,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";
import {
  createProgramme,
  deleteProgramme,
  findProgrammeById,
  findProgrammesByFestival,
  findProgrammeWithAssignments,
  updateProgramme,
} from "@/features/programmes/repositories/programme.repository";
import { assertProgrammePreReporting } from "./programme-status.service";

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
      maxParticipantsPerTeam?: number;
      maxPoints?: number;
    },
    actor?: { createdByEmail?: string; createdByName?: string },
  ) {
    // Enforce duplicate check: name + categoryId + type
    const existing = await db.query.programme.findFirst({
      where: and(
        eq(programmes.festivalId, festivalId),
        eq(sql`LOWER(${programmes.name})`, data.name.trim().toLowerCase()),
        eq(programmes.categoryId, data.categoryId),
        eq(programmes.type, data.type),
      ),
      columns: { id: true },
    });

    if (existing) {
      throw new AppError(
        "A programme with this name, category, and type already exists.",
      );
    }

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
        maxParticipantsPerTeam: data.maxParticipantsPerTeam || 1,
        ...(actor?.createdByEmail
          ? { createdByEmail: actor.createdByEmail }
          : {}),
        ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
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
      maxParticipantsPerTeam?: number;
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
      const now = serverNowIso();
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
        maxParticipantsPerTeam: p.maxParticipantsPerTeam || 1,
      }));

      return await db.transaction(async (tx) => {
        const chunkSize = 100;
        const results = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const inserted = await tx
            .insert(programmes)
            .values(chunk)
            .returning();
          results.push(...inserted);
        }
        return results;
      });
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
      maxParticipantsPerTeam?: number;
      maxPoints?: number;
    },
  ) {
    const existingDetails = await this.getDetails(id, festivalId);
    assertProgrammePreReporting(existingDetails.status);

    if (data.name || data.categoryId || data.type) {
      const existingComposite = await db.query.programme.findFirst({
        where: and(
          eq(programmes.festivalId, festivalId),
          eq(
            sql`LOWER(${programmes.name})`,
            (data.name || existingDetails.name).trim().toLowerCase(),
          ),
          eq(
            programmes.categoryId,
            data.categoryId || existingDetails.categoryId,
          ),
          eq(programmes.type, (data.type || existingDetails.type) as any),
          ne(programmes.id, id),
        ),
        columns: { id: true },
      });

      if (existingComposite) {
        throw new AppError(
          "A programme with this name, category, and type already exists.",
        );
      }
    }

    return updateProgramme(id, {
      name: data.name,
      categoryId: data.categoryId,
      type: data.type,
      stageType: data.stageType,
      maxParticipantsPerGroup: data.maxParticipantsPerGroup,
      maxTeamsPerGroup: data.maxTeamsPerGroup,
      maxParticipantsPerTeam: data.maxParticipantsPerTeam,
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

    const [{ scheduleCount }] = await db
      .select({ scheduleCount: count() })
      .from(scheduleEntryTable)
      .where(eq(scheduleEntryTable.programmeId, id));

    if (scheduleCount > 0) {
      throw new AppError(
        "Programme is scheduled. Remove it from the schedule before deleting.",
      );
    }

    await UsageCounterService.incrementUsage(
      festivalId,
      "programmes",
      -1,
    ).catch(() => {});

    return deleteProgramme(id);
  },
};
