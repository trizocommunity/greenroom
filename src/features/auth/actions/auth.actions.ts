"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import {
  findUserById,
  updateUser,
} from "@/features/auth/repositories/user.repository";
import { onboardingSchema } from "@/features/auth/schemas/auth.schema";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

export async function completeOnboardingAction(data: {
  fullName: string;
  displayName: string;
}): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const { fullName, displayName } = onboardingSchema.parse(data);

    await updateUser(session.userId, {
      fullName,
      displayName,
    });

    await createAuditLog({
      action: "COMPLETE_ONBOARDING",
      targetType: "USER",
      targetId: session.userId,
      metadata: { fullName, displayName },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
