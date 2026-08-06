"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import * as repo from "../repositories/food-entry.repository";
import {
  scanFoodEntrySchema,
  upsertFoodSlotsSchema,
} from "../schemas/food-entry.schema";
import * as service from "../services/food-entry.service";

const getFilteredEntriesSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export async function getFilteredEntriesAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = getFilteredEntriesSchema.parse(data);
  const timezone = await repo.getFestivalTimezone(parsed.festivalId);
  const entries = await repo.getEntriesByFilters(
    parsed.festivalId,
    parsed.sessionId,
    parsed.date,
    timezone,
    parsed.groupId,
    parsed.categoryId,
  );
  return { success: true, entries };
}

export async function upsertFoodSlotsAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = upsertFoodSlotsSchema.parse(data);
  const keepSlotIds = parsed.slots.map((s) => s.id).filter(Boolean) as string[];
  await repo.deleteFoodSlots(parsed.festivalId, keepSlotIds);

  for (const slot of parsed.slots) {
    await repo.upsertFoodSlot({
      id: slot.id || crypto.randomUUID(),
      festivalId: parsed.festivalId,
      slotOrder: slot.slotOrder,
      name: slot.name,
      windowStartMin: slot.windowStartMin,
      windowEndMin: slot.windowEndMin,
      createdByName: session.name || "Unknown",
      createdByEmail: session.email || undefined,
    });
  }

  revalidatePath(`/dashboard/[slug]/event-works/food-entry`);
  return { success: true };
}

export async function scanFoodEntryAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = scanFoodEntrySchema.parse(data);

  try {
    const entry = await service.recordFoodEntry(
      parsed.festivalId,
      parsed.sessionId,
      parsed.chestNumber,
      session.userId,
      session.name || undefined,
      session.email || undefined,
    );
    revalidatePath(`/dashboard/[slug]/event-works/food-entry`);
    return { success: true, entry };
  } catch (error: any) {
    if (error.code) {
      // TRPCError like object
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function toggleSessionStatusAction(
  sessionId: string,
  status: "OPEN" | "CLOSED",
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await service.toggleSessionStatus(sessionId, status);
  revalidatePath(`/dashboard/[slug]/event-works/food-entry`);
  return { success: true };
}
