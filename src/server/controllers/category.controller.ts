import { CategoryService } from "@/server/services/category.service";

export async function index(festivalId: string) {
  return CategoryService.getAll(festivalId);
}

export async function store(festivalId: string, data: any) {
  // Simple validation or sanitation can happen here if needed,
  // but logic is in Service.
  if (!data.name) throw new Error("Name is required");

  return CategoryService.create(festivalId, data);
}

export async function update(id: string, festivalId: string, data: any) {
  return CategoryService.update(id, festivalId, data);
}

export async function destroy(id: string, festivalId: string) {
  return CategoryService.delete(id, festivalId);
}
