"use server";

import { getSession } from "@/core/auth/session";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import type { Tier } from "@/core/types/app-enums";
import type {
  BooleanFeaturePath,
  FeaturePath,
} from "@/features/plan-features/services/feature-gate";
import type { FeatureTag } from "@/features/plan-features/services/features-tags";
import {
  FEATURE_TAGS,
  getFeatureTagRequirements,
} from "@/features/plan-features/services/features-tags";
import {
  loadAllFeatureOverrides,
  setPlanFeatureOverride as setOverride,
} from "@/features/plan-features/services/plan-features.service";

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

    const matrix = await loadAllFeatureOverrides();
    return { success: true, data: matrix };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setPlanFeatureOverrideAction(
  tier: Tier,
  feature: BooleanFeaturePath,
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
