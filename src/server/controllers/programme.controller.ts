import { ProgrammeService } from "@/server/services/programme.service";

export async function index(editionId: string, categoryId?: string) {
  return ProgrammeService.getAll(editionId, categoryId);
}

export async function store(editionId: string, data: any) {
  if (!data.name || !data.categoryId)
    throw new Error("Name and Category are required");

  return ProgrammeService.create(editionId, {
    categoryId: data.categoryId,
    name: data.name,
    type: data.type || "INDIVIDUAL",
    stageType: data.stageType || "STAGE",
    maxEntries: data.maxEntries,
  });
}

export async function update(id: string, editionId: string, data: any) {
  return ProgrammeService.update(id, editionId, data);
}

export async function destroy(id: string, editionId: string) {
  return ProgrammeService.delete(id, editionId);
}
