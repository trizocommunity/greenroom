"use server";

import type { Tier } from "@/lib/prisma-enums";
import type { FeatureTag } from "@/lib/features-tags";
import type { FeaturePath } from "@/lib/features";
import { FEATURE_TAGS, isFeatureTagEnabled } from "@/lib/features-tags";
import { getEffectivePlanFeatureMatrix } from "@/server/services/plan-features.service";

const TIERS: Tier[] = ["BASIC", "STANDARD", "PRO"];

export async function getEffectiveFeatureTagEnabled(
  tier: Tier,
  tag: FeatureTag,
): Promise<boolean> {
  const matrix = await getEffectivePlanFeatureMatrix();
  const effectiveFeatureMatrix = (matrix[tier] ??
    {}) as Partial<Record<FeaturePath, boolean>>;

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

