"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, updateSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/server/services/audit-log.service";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
});

import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import type { ActionResponse } from "@/types/actions";

export async function updateProfile(
  data: z.infer<typeof profileSchema>,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const parsedData = profileSchema.parse(data);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: parsedData.fullName,
        displayName: parsedData.displayName,
        age: parsedData.age,
      },
    });

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
