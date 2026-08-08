import { eq } from "drizzle-orm";
import { PLAN_FEATURE_TOGGLE_KEYS } from "@/config/plan-features.config";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { systemConfig } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type {
  BooleanFeaturePath,
  FeaturePath,
} from "@/features/plan-features/services/feature-gate";

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

function getBaseFeatureMatrix(): Record<
  Tier,
  Partial<Record<BooleanFeaturePath, boolean>>
> {
  const tiers: Tier[] = ["BASIC", "STANDARD", "PRO"];
  const result = {} as Record<
    Tier,
    Partial<Record<BooleanFeaturePath, boolean>>
  >;
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

/** Load the full override matrix for all tiers (used by Super Admin UI). */
export async function loadAllFeatureOverrides(): Promise<
  Record<Tier, Partial<Record<BooleanFeaturePath, boolean>>>
> {
  const overrides = await getStoredOverrides();
  const base = getBaseFeatureMatrix();

  const tiers: Tier[] = ["BASIC", "STANDARD", "PRO"];
  const result = {} as Record<
    Tier,
    Partial<Record<BooleanFeaturePath, boolean>>
  >;

  for (const tier of tiers) {
    result[tier] = { ...base[tier] };
    const tierOverrides = overrides[tier];
    if (tierOverrides && typeof tierOverrides === "object") {
      for (const key of Object.keys(tierOverrides) as FeaturePath[]) {
        if (
          TOGGLE_KEY_SET.has(key) &&
          typeof tierOverrides[key] === "boolean"
        ) {
          result[tier][key as BooleanFeaturePath] = tierOverrides[key];
        }
      }
    }
  }
  return result;
}

/** Load the effective override map for a single tier (used by most callers). */
export async function loadFeatureOverrides(
  tier: Tier,
): Promise<Partial<Record<BooleanFeaturePath, boolean>>> {
  const matrix = await loadAllFeatureOverrides();
  return matrix[tier] ?? {};
}

export async function setPlanFeatureOverride(
  tier: Tier,
  feature: BooleanFeaturePath,
  enabled: boolean,
): Promise<void> {
  const overrides = await getStoredOverrides();
  const tierOverrides = overrides[tier] ?? {};
  tierOverrides[feature] = enabled;
  overrides[tier] = tierOverrides;

  try {
    const { randomUUID } = await import("crypto");
    const now = serverNowIso();
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
