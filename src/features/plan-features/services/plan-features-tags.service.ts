"use server";

import type { Tier } from "@/core/types/app-enums";
import type { FeaturePath } from "@/features/plan-features/services/features";
import type { FeatureTag } from "@/features/plan-features/services/features-tags";
import {
  FEATURE_TAGS,
  isFeatureTagEnabled,
} from "@/features/plan-features/services/features-tags";
import { getEffectivePlanFeatureMatrix } from "@/features/plan-features/services/plan-features.service";

const TIERS: Tier[] = ["BASIC", "STANDARD", "PRO"];

export async function getEffectiveFeatureTagEnabled(
  tier: Tier,
  tag: FeatureTag,
): Promise<boolean> {
  const matrix = await getEffectivePlanFeatureMatrix();
  const effectiveFeatureMatrix = (matrix[tier] ?? {}) as Partial<
    Record<FeaturePath, boolean>
  >;

  // `isFeatureTagEnabled` applies tier constraints + hard-block rules.
  return isFeatureTagEnabled({
    tier,
    tag,
    effectiveFeatureMatrix,
  });
}

export async function getEffectiveFeatureTagMatrix(): Promise<
  Record<Tier, Partial<Record<FeatureTag, boolean>>>
> {
  const matrix = await getEffectivePlanFeatureMatrix();

  const out = {} as Record<Tier, Partial<Record<FeatureTag, boolean>>>;
  for (const tier of TIERS) {
    const featureMatrix = (matrix[tier] ?? {}) as Partial<
      Record<FeaturePath, boolean>
    >;

    const row = {} as Partial<Record<FeatureTag, boolean>>;
    for (const tag of FEATURE_TAGS) {
      row[tag] = isFeatureTagEnabled({
        tier,
        tag,
        effectiveFeatureMatrix: featureMatrix,
      });
    }

    out[tier] = row;
  }

  return out;
}
