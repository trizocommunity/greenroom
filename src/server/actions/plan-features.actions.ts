"use server";

import type { Tier } from "@prisma/client";
import type { FeaturePath } from "@/lib/features";
import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import {
  getEffectivePlanFeatureMatrix,
  setPlanFeatureOverride as setOverride,
} from "@/server/services/plan-features.service";
import type { ActionResponse } from "@/types/actions";

function assertSuperAdmin() {
  // Session check is done in layout; action can be called only from super-admin pages.
  // For safety we still validate in the setter.
}

export async function getPlanFeatureMatrixAction(): Promise<
  ActionResponse<Record<Tier, Partial<Record<FeaturePath, boolean>>>>
> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    if (session.role !== "SUPER_ADMIN")
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);

    const matrix = await getEffectivePlanFeatureMatrix();
    return { success: true, data: matrix };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setPlanFeatureOverrideAction(
  tier: Tier,
  feature: FeaturePath,
  enabled: boolean,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    if (session.role !== "SUPER_ADMIN")
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);

    assertSuperAdmin();
    await setOverride(tier, feature, enabled);
    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
