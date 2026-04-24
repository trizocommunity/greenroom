"use server";

import type { Tier } from "@/lib/app-enums";
import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import type { FeaturePath } from "@/lib/features";
import type { FeatureTag } from "@/lib/features-tags";
import { FEATURE_TAGS, getFeatureTagRequirements } from "@/lib/features-tags";
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

export async function setPlanFeatureTagOverrideAction(
  tier: Tier,
  tag: FeatureTag,
  enabled: boolean,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    if (session.role !== "SUPER_ADMIN")
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);

    if (!FEATURE_TAGS.includes(tag)) {
      throw new AppError("Unknown feature tag.");
    }

    const req = getFeatureTagRequirements(tag);

    // Enforce tag semantics (hard-blocks / tier constraints) even when admin
    // overrides underlying FeaturePaths.
    if (req.allowedTiers && !req.allowedTiers.includes(tier)) {
      throw new AppError("This feature tag is not applicable for this tier.");
    }

    if (req.hardBlockBasics && tier === "BASIC" && enabled) {
      throw new AppError(
        "External judging is hard-blocked on BASIC (tag enforcement).",
      );
    }

    const featuresToSet = req.requires ?? [];
    for (const feature of featuresToSet) {
      await setOverride(tier, feature, enabled);
    }

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
