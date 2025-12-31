"use server";

import { prisma } from "@/lib/db";
import { ProgrammeService } from "@/server/services/programme.service";

export async function getProgrammesAction(festivalId: string) {
  return ProgrammeService.getAll(festivalId);
}

export async function getProgrammeDetailsAction(
  festivalId: string,
  id: string,
) {
  return ProgrammeService.getDetails(id, festivalId);
}

export async function createProgrammeAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    type?: string;
    stageType?: string;
    maxEntries?: number;
    maxTeamSize?: number;
  },
) {
  // Validate Dependencies
  const categoryCount = await prisma.category.count({
    where: { festivalId },
  });

  if (categoryCount === 0) {
    throw new Error(
      "Create a category first.",
    );
  }

  return ProgrammeService.create(festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: (data.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL",
    stageType: (data.stageType as "STAGE" | "NON_STAGE") || "STAGE",
    maxEntries: data.maxEntries,
    maxTeamSize: data.maxTeamSize,
  });
}

export async function deleteProgrammeAction(festivalId: string, id: string) {
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
    maxEntries?: number;
    maxTeamSize?: number;
  },
) {
  // Map data to service format if needed, or if service accepts partials
  return ProgrammeService.update(id, festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: data.type
      ? (data.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL"
      : undefined,
    stageType: data.stageType
      ? (data.stageType as "STAGE" | "NON_STAGE") || "STAGE"
      : undefined,
    maxEntries: data.maxEntries,
    maxTeamSize: data.maxTeamSize,
  });
}
