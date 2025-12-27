import { ProgrammeService } from "@/server/services/programme.service";

export async function index(festivalId: string, categoryId?: string) {
  return ProgrammeService.getAll(festivalId, categoryId);
}

export async function store(festivalId: string, data: any) {
  if (!data.name || !data.categoryId)
    throw new Error("Name and Category are required");

  return ProgrammeService.create(festivalId, {
    categoryId: data.categoryId,
    name: data.name,
    type: data.type || "INDIVIDUAL",
    stageType: data.stageType || "STAGE",
    maxEntries: data.maxEntries,
  });
}

export async function update(id: string, festivalId: string, data: any) {
  return ProgrammeService.update(id, festivalId, data);
}

export async function destroy(id: string, festivalId: string) {
  return ProgrammeService.delete(id, festivalId);
}
