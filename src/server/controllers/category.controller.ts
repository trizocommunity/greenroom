import { CategoryService } from "@/server/services/category.service";

export async function index(editionId: string) {
  return CategoryService.getAll(editionId);
}

export async function store(editionId: string, data: any) {
  // Simple validation or sanitation can happen here if needed,
  // but logic is in Service.
  if (!data.name) throw new Error("Name is required");

  return CategoryService.create(editionId, data);
}

export async function update(id: string, editionId: string, data: any) {
  return CategoryService.update(id, editionId, data);
}

export async function destroy(id: string, editionId: string) {
  return CategoryService.delete(id, editionId);
}
