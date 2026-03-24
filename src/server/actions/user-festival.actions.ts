"use server";

import { InstitutionType } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import {
  type UpdateFestivalInput,
  updateFestivalSchema,
} from "@/lib/validations/festival";
import { createAuditLog } from "@/server/services/audit-log.service";
import { assertFestivalMutationAllowed } from "@/server/services/festival-lifecycle-policy.service";

export async function getMyFestival() {
  const session = await getSession();
  if (!session?.userId) return null;

  const festival = await prisma.festival.findUnique({
    where: { ownerId: session.userId },
  });

  return festival;
}

import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import type { ActionResponse } from "@/types/actions";

export async function updateFestivalAction(
  data: UpdateFestivalInput,
): Promise<ActionResponse<import("@prisma/client").Festival>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const validated = updateFestivalSchema.parse(data);

    const ownedFestival = await prisma.festival.findUnique({
      where: { ownerId: session.userId },
      select: { id: true, createdAt: true, expiresAt: true },
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

    // If slug is being updated, we might want to sanitize it or check availability overtly,
    // but Prisma unique constraint will handle the final check.
    // However, basic sanitization similar to creation is good practice if not fully handled by schema.
    // Assuming schema handles basic regex.

    const festival = await prisma.festival.update({
      where: { ownerId: session.userId },
      data: validated,
    });

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
