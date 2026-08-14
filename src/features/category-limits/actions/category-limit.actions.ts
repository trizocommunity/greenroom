"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/errors";
import { CategoryLimitService } from "@/features/category-limits/services/category-limit.service";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { isProTier } from "@/features/plan-features/services/tier";

async function assertProTierAccess(festivalId: string, session: any) {
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError("Festival not found", "FESTIVAL_NOT_FOUND");
  if (!isProTier(festival.tier)) {
    throw new AppError(
      "Category limits require a PRO subscription.",
      "FEATURE_NOT_AVAILABLE",
    );
  }
  return festival;
}

/** Upsert the limit for a category. PRO only. */
export async function upsertCategoryLimitAction(
  festivalId: string,
  categoryId: string,
  input: { maxStage: number | null; maxNonStage: number | null; maxAll: number | null },
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertProTierAccess(festivalId, session);

  const result = await CategoryLimitService.upsert(categoryId, festivalId, input);
  revalidatePath("/", "layout");
  return result;
}

/** Remove all limits for a category. PRO only. */
export async function removeCategoryLimitAction(
  festivalId: string,
  categoryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertProTierAccess(festivalId, session);

  await CategoryLimitService.remove(categoryId, festivalId);
  revalidatePath("/", "layout");
}

/** Get all categories with their limits + violation counts. PRO only. */
export async function getCategoryLimitsWithViolationsAction(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertFestivalAccess(session, festivalId);

  return CategoryLimitService.getLimitsWithViolationsForFestival(festivalId);
}

/** Get violators for a specific category. PRO only. */
export async function getCategoryViolatorsAction(
  festivalId: string,
  categoryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertFestivalAccess(session, festivalId);

  return CategoryLimitService.getViolatorsForCategory(categoryId, festivalId);
}

/** Get all violators for the festival across all categories. PRO only. */
export async function getAllViolatorsAction(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertFestivalAccess(session, festivalId);

  return CategoryLimitService.getAllViolatorsForFestival(festivalId);
}

/** Get the limit-warning status for a single participant. */
export async function getParticipantLimitStatusAction(
  participantId: string,
  festivalId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError("Unauthorized", "UNAUTHORIZED");

  await assertFestivalAccess(session, festivalId);

  return CategoryLimitService.computeParticipantLimitStatus(
    participantId,
    festivalId,
  );
}
