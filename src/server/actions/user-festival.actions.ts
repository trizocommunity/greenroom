"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { festival as festivalTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import {
  type UpdateFestivalInput,
  updateFestivalSchema,
} from "@/lib/validations/festival";
import { createAuditLog } from "@/server/services/audit-log.service";
import { assertFestivalMutationAllowed } from "@/server/services/festival-lifecycle-policy.service";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import type { ActionResponse } from "@/types/actions";

export async function getMyFestival() {
  const session = await getSession();
  if (!session?.userId) return null;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.ownerId, session.userId),
  });

  return festival;
}

export async function updateFestivalAction(
  data: UpdateFestivalInput,
): Promise<ActionResponse<any>> { // Changed to any to avoid Prisma dependency in type
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const validated = updateFestivalSchema.parse(data);

    const ownedFestival = await db.query.festival.findFirst({
      where: eq(festivalTable.ownerId, session.userId),
      columns: { id: true, createdAt: true, expiresAt: true },
    });
    if (!ownedFestival) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const keys = Object.keys(validated);
    const isDateOnlyUpdate =
      keys.length > 0 &&
      keys.every((key) => key === "startDate" || key === "endDate");
    await assertFestivalMutationAllowed(ownedFestival.id, {
      allowPast: isDateOnlyUpdate,
    });

    const incomingStart =
      validated.startDate !== undefined && validated.startDate !== null
        ? new Date(validated.startDate)
        : null;
    const incomingEnd =
      validated.endDate !== undefined && validated.endDate !== null
        ? new Date(validated.endDate)
        : null;
    const planStart = new Date(ownedFestival.createdAt);
    const planEnd = ownedFestival.expiresAt
      ? new Date(ownedFestival.expiresAt)
      : null;

    if (incomingStart && Number.isNaN(incomingStart.getTime())) {
      throw new AppError("Invalid start date");
    }
    if (incomingEnd && Number.isNaN(incomingEnd.getTime())) {
      throw new AppError("Invalid end date");
    }
    if (incomingStart && incomingEnd && incomingStart > incomingEnd) {
      throw new AppError("Start date must be before end date");
    }
    if (incomingStart && incomingStart < planStart) {
      throw new AppError("Start date must be on/after plan created date");
    }
    if (incomingEnd && planEnd && incomingEnd > planEnd) {
      throw new AppError("End date must be on/before plan expiry date");
    }

    const updatedFestivals = await db.update(festivalTable).set({
      ...validated,
      updatedAt: new Date().toISOString(),
    }).where(eq(festivalTable.ownerId, session.userId)).returning();

    const festival = updatedFestivals[0];

    await createAuditLog({
      action: "UPDATE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: festival.id,
      metadata: { changes: Object.keys(validated) },
    });

    return { success: true, data: festival };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
