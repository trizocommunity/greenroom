"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { CategoryService } from "@/server/services/category.service";

export async function getCategoriesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return CategoryService.getAll(festivalId);
}

export async function createCategoryAction(
  festivalId: string,
  data: { name: string; description?: string; type?: "SINGLE" | "GENERAL" },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return CategoryService.create(festivalId, data);
}

export async function deleteCategoryAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return CategoryService.delete(id, festivalId);
}

export async function updateCategoryAction(
  festivalId: string,
  id: string,
  data: { name: string; description?: string; type?: "SINGLE" | "GENERAL" },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return CategoryService.update(id, festivalId, data);
}
