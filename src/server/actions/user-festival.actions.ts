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

export async function updateFestivalAction(data: UpdateFestivalInput) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const validated = updateFestivalSchema.parse(data);

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
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return {
      success: false,
      error: error.message || "Failed to update festival",
    };
  }
}
