"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as userTable } from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
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

    await db
      .update(userTable)
      .set({
        fullName: parsedData.fullName,
        displayName: parsedData.displayName,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userTable.id, session.userId));

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
