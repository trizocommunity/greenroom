"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalMember as memberTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  type UpdateFestivalInput,
  updateFestivalSchema,
} from "@/features/festivals/schemas/festival.schema";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

export async function getMyFestival() {
  const session = await getSession();
  if (!session?.userId) return null;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.ownerId, session.userId),
  });

  return festival;
}

export async function updateFestivalAction(
  festivalId: string,
  data: UpdateFestivalInput,
): Promise<ActionResponse<any>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const validated = updateFestivalSchema.parse(data);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      with: {
        festivalMembers: {
          where: and(
            eq(memberTable.userId, session.userId),
            eq(memberTable.role, "ADMIN"),
          ),
        },
      },
    });

    const isAdmin =
      festival?.festivalMembers && festival.festivalMembers.length > 0;
    const isOwner = festival?.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isAdmin && !isOwner && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const keys = Object.keys(validated);
    const isDateOnlyUpdate =
      keys.length > 0 &&
      keys.every((key) => key === "startDate" || key === "endDate");
    await assertFestivalMutationAllowed(festival.id, {
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
    const planStart = new Date(festival.createdAt);
    const planEnd = festival.expiresAt ? new Date(festival.expiresAt) : null;

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

    const updatedFestivals = await db
      .update(festivalTable)
      .set({
        ...validated,
        startDate: validated.startDate
          ? validated.startDate.toISOString()
          : undefined,
        endDate: validated.endDate
          ? validated.endDate.toISOString()
          : undefined,
        programmeAssignmentDeadline: validated.programmeAssignmentDeadline
          ? new Date(validated.programmeAssignmentDeadline).toISOString()
          : validated.programmeAssignmentDeadline === null
            ? null
            : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(festivalTable.id, festivalId))
      .returning();

    const updated = updatedFestivals[0];

    await createAuditLog({
      action: "UPDATE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: updated.id,
      metadata: { changes: Object.keys(validated) },
    });

    return { success: true, data: updated };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
