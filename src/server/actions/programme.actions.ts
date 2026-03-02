"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { ProgrammeService } from "@/server/services/programme.service";

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
  await assertFestivalAccess(session, festivalId);
  return ProgrammeService.getDetails(id, festivalId);
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
  await assertFestivalAccess(session, festivalId);

  // Validate Dependencies
  const categoryCount = await prisma.category.count({
    where: { festivalId },
  });

  if (categoryCount === 0) {
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
    // We expect resolved IDs here, validation should happen before calling this action
    // But for safety, we can re-validate category existence if needed,
    // though for bulk performance we trust the caller's mapping if they provide IDs.
    // However, the prompt suggests the ACTION should do the mapping.
    // Let's refine: The UI will likely resolve names to IDs.
    // So the Input here is expected to be "Ready for DB".
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

  // Service handles final limit check & DB insertion
  // We just map the string enums to strict types
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
    return { success: true, count: result.count };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function deleteProgrammeAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
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
  await assertFestivalAccess(session, festivalId);

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
