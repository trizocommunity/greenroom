"use server";

import { ProgrammeService } from "@/server/services/programme.service";

export async function getProgrammesAction(festivalId: string) {
  return ProgrammeService.getAll(festivalId);
}

export async function createProgrammeAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    type?: string;
    stageType?: string;
    maxEntries?: number;
  },
) {
  return ProgrammeService.create(festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: (data.type as "INDIVIDUAL" | "GROUP") || "INDIVIDUAL",
    stageType: (data.stageType as "STAGE" | "NON_STAGE") || "STAGE",
    maxEntries: data.maxEntries,
  });
}

export async function deleteProgrammeAction(festivalId: string, id: string) {
  return ProgrammeService.delete(id, festivalId);
}
