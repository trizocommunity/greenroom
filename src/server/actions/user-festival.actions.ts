"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InstitutionType } from "@prisma/client";
import { z } from "zod";

import {
  updateFestivalSchema,
  type UpdateFestivalInput,
} from "@/lib/validations/festival";
import { createAuditLog } from "@/server/services/audit-log.service";

export async function getMyFestival() {
  const session = await getSession();
  if (!session?.userId) return null;

  const festival = await prisma.festival.findUnique({
    where: { ownerId: session.userId },
  });

  return festival;
}

import { AppError, handleActionError, ERROR_MESSAGES } from "@/lib/errors";
import type { ActionResponse } from "@/types/actions";

export async function updateFestivalAction(
  data: UpdateFestivalInput,
): Promise<ActionResponse<any>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const validated = updateFestivalSchema.parse(data);

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
  } catch (error: any) {
    return handleActionError(error);
  }
}
