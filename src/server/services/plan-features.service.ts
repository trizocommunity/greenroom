import type { Tier } from "@prisma/client";
import type { FeaturePath } from "@/lib/features";
import { TIER_CONFIG } from "@/config/pricing";
import { PLAN_FEATURE_TOGGLE_KEYS } from "@/config/plan-features.config";
import { prisma } from "@/lib/db";

const CONFIG_KEY = "planFeatureOverrides";

export type PlanFeatureOverrides = Partial<
  Record<Tier, Partial<Record<FeaturePath, boolean>>>
>;

async function getStoredOverrides(): Promise<PlanFeatureOverrides> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });
    if (!row || !row.value || typeof row.value !== "object") return {};
    return row.value as PlanFeatureOverrides;
  } catch {
    return {};
  }
}

export async function getPlanFeatureOverrides(): Promise<PlanFeatureOverrides> {
  return getStoredOverrides();
}

/** Effective boolean feature state per tier (config merged with admin overrides). */
export function getEffectiveFeatureMatrix(): Record<
  Tier,
  Partial<Record<FeaturePath, boolean>>
> {
  const tiers: Tier[] = ["BASIC", "STANDARD", "PRO"];
  const result = {} as Record<Tier, Partial<Record<FeaturePath, boolean>>>;
  for (const tier of tiers) {
    const configFeatures = TIER_CONFIG[tier]?.features;
    if (!configFeatures) continue;
    result[tier] = {};
    for (const key of PLAN_FEATURE_TOGGLE_KEYS) {
      const v = configFeatures[key];
      if (typeof v === "boolean") result[tier][key] = v;
    }
  }
  return result;
}

/** Get effective feature matrix (config + DB overrides). Used by super-admin UI and by feature checks. */
export async function getEffectivePlanFeatureMatrix(): Promise<
  Record<Tier, Partial<Record<FeaturePath, boolean>>>
> {
  const overrides = await getStoredOverrides();
  const base = getEffectiveFeatureMatrix();

  const tiers: Tier[] = ["BASIC", "STANDARD", "PRO"];
  const result = {} as Record<Tier, Partial<Record<FeaturePath, boolean>>>;

  for (const tier of tiers) {
    result[tier] = { ...base[tier] };
    const tierOverrides = overrides[tier];
    if (tierOverrides && typeof tierOverrides === "object") {
      for (const key of Object.keys(tierOverrides) as FeaturePath[]) {
        if (PLAN_FEATURE_TOGGLE_KEYS.includes(key) && typeof tierOverrides[key] === "boolean") {
          result[tier][key] = tierOverrides[key];
        }
      }
    }
  }
  return result;
}

/** Single feature enabled for a tier (respects admin overrides). */
export async function getEffectiveFeatureEnabled(
  tier: Tier,
  feature: FeaturePath,
): Promise<boolean> {
  const matrix = await getEffectivePlanFeatureMatrix();
  const value = matrix[tier]?.[feature];
  if (typeof value === "boolean") return value;
  return Boolean(TIER_CONFIG[tier]?.features?.[feature]);
}

/** Effective features for one tier (for dashboard context). */
export async function getEffectiveTierFeatures(
  tier: Tier,
): Promise<Partial<Record<FeaturePath, boolean>>> {
  const matrix = await getEffectivePlanFeatureMatrix();
  return matrix[tier] ?? {};
}

export async function setPlanFeatureOverride(
  tier: Tier,
  feature: FeaturePath,
  enabled: boolean,
): Promise<void> {
  const overrides = await getStoredOverrides();
  const tierOverrides = overrides[tier] ?? {};
  tierOverrides[feature] = enabled;
  overrides[tier] = tierOverrides;

  try {
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: overrides },
      update: { value: overrides },
    });
  } catch (err) {
    throw new Error(
      "Plan feature overrides are not available. Run: npx prisma migrate dev --name add_system_config_plan_features",
      { cause: err },
    );
  }
}
