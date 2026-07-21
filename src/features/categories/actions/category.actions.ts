"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { CategoryService } from "@/features/categories/services/category.service";

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
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const result = await CategoryService.create(festivalId, data);
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/categories`);
  }
  return result;
}

export async function deleteCategoryAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const result = await CategoryService.delete(id, festivalId);
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/categories`);
  }
  return result;
}

export async function updateCategoryAction(
  festivalId: string,
  id: string,
  data: { name: string; description?: string; type?: "SINGLE" | "GENERAL" },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const result = await CategoryService.update(id, festivalId, data);
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/categories`);
  }
  return result;
}
