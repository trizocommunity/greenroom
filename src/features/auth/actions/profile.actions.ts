"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as userTable } from "@/core/database/schema";
import { isValidTimezone, zodTimezoneLoose } from "@/core/datetime";
import { clearUserTimezoneCache } from "@/core/datetime/current-user";
import { serverNowIso } from "@/core/datetime/server";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .optional(),
  timezone: zodTimezoneLoose.optional(),
});

export async function updateProfile(
  data: z.infer<typeof profileSchema>,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const parsedData = profileSchema.parse(data);
    const timezone =
      parsedData.timezone && isValidTimezone(parsedData.timezone)
        ? parsedData.timezone
        : null;

    const update: Partial<typeof userTable.$inferInsert> = {
      updatedAt: serverNowIso(),
    };
    if (parsedData.fullName !== undefined) update.fullName = parsedData.fullName;
    if (parsedData.displayName !== undefined)
      update.displayName = parsedData.displayName;
    if (parsedData.timezone !== undefined) update.timezone = timezone;

    await db.update(userTable).set(update).where(eq(userTable.id, session.userId));

    clearUserTimezoneCache(session.userId);

    await createAuditLog({
      action: "UPDATE_PROFILE",
      targetType: "USER",
      targetId: session.userId,
      metadata: { changes: parsedData },
    });

    revalidatePath("/profile");

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
