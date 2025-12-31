"use server";

import { CategoryService } from "@/server/services/category.service";

export async function getCategoriesAction(festivalId: string) {
  return CategoryService.getAll(festivalId);
}

export async function createCategoryAction(
  festivalId: string,
  data: { name: string; description?: string; type?: "SINGLE" | "GENERAL" },
) {
  return CategoryService.create(festivalId, data);
}

export async function deleteCategoryAction(festivalId: string, id: string) {
  return CategoryService.delete(id, festivalId);
}

export async function updateCategoryAction(
  festivalId: string,
  id: string,
  data: { name: string; description?: string; type?: "SINGLE" | "GENERAL" },
) {
  return CategoryService.update(id, festivalId, data);
}
