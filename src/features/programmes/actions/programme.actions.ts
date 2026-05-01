"use server";

import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  programme as programmeTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import { ProgrammeService } from "@/features/programmes/services/programme.service";

export async function getProgrammesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return ProgrammeService.getAll(festivalId);
}

export async function getProgrammeDetailsAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  return ProgrammeService.getDetails(id, festivalId);
}

export async function validateProgrammesAction(
  festivalId: string,
  candidates: { name: string; categoryId: string; type: string }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  if (candidates.length === 0) return {};

  // Build OR conditions for each candidate
  const conditions = candidates
    .filter((c) => c.name) // Ensure name exists
    .map((c) =>
      and(
        eq(sql`LOWER(${programmeTable.name})`, c.name.trim().toLowerCase()),
        eq(programmeTable.categoryId, c.categoryId),
        eq(programmeTable.type, (c.type as any) || "INDIVIDUAL"),
      ),
    );

  if (conditions.length === 0) return {};

  const existing = await db.query.programme.findMany({
    where: and(eq(programmeTable.festivalId, festivalId), or(...conditions)),
    columns: { name: true, categoryId: true, type: true },
  });

  const conflicts: Record<string, string> = {};
  existing.forEach((p) => {
    const key = `${p.name.toLowerCase()}:${p.categoryId}:${p.type}`;
    conflicts[key] = "Programme already exists with this category and type";
  });

  return conflicts;
}

export async function createProgrammeAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    type?: string;
    stageType?: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxStudentsPerTeam?: number;
    maxPoints?: number;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const [categoryCountResult] = await db
    .select({ c: count() })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festivalId));

  if (categoryCountResult.c === 0) {
    throw new AppError(ERROR_MESSAGES.CATEGORY_REQUIRED);
  }

  return ProgrammeService.create(festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: (data.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL",
    stageType: (data.stageType as "STAGE" | "NON_STAGE") || "STAGE",
    maxParticipantsPerGroup: data.maxParticipantsPerGroup,
    maxTeamsPerGroup: data.maxTeamsPerGroup,
    maxStudentsPerTeam: data.maxStudentsPerTeam,
  });
}

export async function bulkCreateProgrammesAction(
  festivalId: string,
  programmes: {
    name: string;
    categoryId: string;
    type: string;
    stageType: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxStudentsPerTeam?: number;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const formatted = programmes.map((p) => ({
    name: p.name,
    categoryId: p.categoryId,
    type: (p.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL",
    stageType: (p.stageType as "STAGE" | "NON_STAGE") || "STAGE",
    maxParticipantsPerGroup: p.maxParticipantsPerGroup,
    maxTeamsPerGroup: p.maxTeamsPerGroup,
    maxStudentsPerTeam: p.maxStudentsPerTeam,
  }));

  try {
    const result = await ProgrammeService.bulkCreate(festivalId, formatted);
    return { success: true, count: result.length };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function deleteProgrammeAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  return ProgrammeService.delete(id, festivalId);
}

export async function updateProgrammeAction(
  festivalId: string,
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    type?: string;
    stageType?: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxStudentsPerTeam?: number;
    maxPoints?: number;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  return ProgrammeService.update(id, festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: data.type
      ? (data.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL"
      : undefined,
    stageType: data.stageType
      ? (data.stageType as "STAGE" | "NON_STAGE") || "STAGE"
      : undefined,
    maxParticipantsPerGroup: data.maxParticipantsPerGroup,
    maxTeamsPerGroup: data.maxTeamsPerGroup,
    maxStudentsPerTeam: data.maxStudentsPerTeam,
  });
}
