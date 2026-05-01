import { eq } from "drizzle-orm";
import { PLAN_FEATURE_TOGGLE_KEYS } from "@/config/plan-features.config";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { systemConfig } from "@/core/database/schema";
import type { FeaturePath } from "@/features/plan-features/services/features";

type Tier = "BASIC" | "STANDARD" | "PRO";

const CONFIG_KEY = "planFeatureOverrides";
const TOGGLE_KEY_SET = new Set<string>(PLAN_FEATURE_TOGGLE_KEYS);

export type PlanFeatureOverrides = Partial<
  Record<Tier, Partial<Record<FeaturePath, boolean>>>
>;

async function getStoredOverrides(): Promise<PlanFeatureOverrides> {
  try {
    const row = await db.query.systemConfig.findFirst({
      where: eq(systemConfig.key, CONFIG_KEY),
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
        if (
          TOGGLE_KEY_SET.has(key) &&
          typeof tierOverrides[key] === "boolean"
        ) {
          result[tier][key] = tierOverrides[key];
        }
      }
    }
  }
  return result;
}

export async function getEffectiveFeatureEnabled(
  tier: Tier,
  feature: FeaturePath,
): Promise<boolean> {
  const matrix = await getEffectivePlanFeatureMatrix();
  const value = matrix[tier]?.[feature];
  if (typeof value === "boolean") return value;
  return Boolean(TIER_CONFIG[tier]?.features?.[feature]);
}

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
    const { randomUUID } = await import("crypto");
    const now = new Date().toISOString();
    await db
      .insert(systemConfig)
      .values({
        id: randomUUID(),
        key: CONFIG_KEY,
        value: overrides,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemConfig.key,
        set: { value: overrides, updatedAt: now },
      });
  } catch (err) {
    throw new Error("Plan feature overrides are not available.", {
      cause: err,
    });
  }
}
