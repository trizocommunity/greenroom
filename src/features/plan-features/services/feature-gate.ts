/**
 * Feature Gate
 *
 * Single seam for asking whether a festival's tier enables a given capability.
 * Reads from TIER_CONFIG and applies optional Super Admin overrides.
 *
 * All functions accept a nullable/string tier and resolve it internally.
 *
 * @example
 * // Config-only check
 * const canExport = isEnabled(festival.tier, 'excelExport');
 *
 * // Override-aware check
 * const canExport = isEnabled(festival.tier, 'excelExport', effectiveFeatures);
 *
 * // Non-boolean value
 * const supportLevel = getValue<string>(festival.tier, 'supportLevel');
 */

import type { TierFeatures } from "@/config/pricing";
import { TIER_CONFIG } from "@/config/pricing";
import type { Tier } from "@/core/types/app-enums";
import { getResolvedTier } from "@/features/plan-features/services/tier";

/** Every feature path defined in the pricing config. */
export type FeaturePath = keyof TierFeatures;

/** Feature paths whose value is boolean and therefore toggleable. */
export type BooleanFeaturePath = {
  [K in keyof TierFeatures]: TierFeatures[K] extends boolean ? K : never;
}[keyof TierFeatures];

/**
 * Check whether a boolean feature is enabled for a tier, applying optional
 * Super Admin overrides when provided.
 */
export function isEnabled(
  tier: Tier | string | null | undefined,
  feature: BooleanFeaturePath,
  overrides?: Partial<Record<BooleanFeaturePath, boolean>> | null,
): boolean {
  const resolvedTier = getResolvedTier(tier);

  if (overrides && feature in overrides) {
    return Boolean(overrides[feature]);
  }

  const value = TIER_CONFIG[resolvedTier]?.features?.[feature];
  return Boolean(value);
}

/**
 * Get a non-boolean feature value for a tier.
 * Returns null if the feature is not defined for the tier.
 */
export function getValue<T = unknown>(
  tier: Tier | string | null | undefined,
  feature: FeaturePath,
): T | null {
  const resolvedTier = getResolvedTier(tier);
  const value = TIER_CONFIG[resolvedTier]?.features?.[feature];

  if (value === undefined) {
    return null;
  }

  return value as T;
}

/**
 * Check whether a tier has at least the required support level.
 */
export function hasSupportLevel(
  tier: Tier | string | null | undefined,
  requiredLevel: "whatsapp" | "priority" | "premium",
): boolean {
  const supportLevels = ["whatsapp", "priority", "premium"];
  const tierLevel = getValue<string>(tier, "supportLevel");

  if (!tierLevel) return false;

  const tierLevelIndex = supportLevels.indexOf(tierLevel);
  const requiredLevelIndex = supportLevels.indexOf(requiredLevel);

  return tierLevelIndex >= requiredLevelIndex;
}

/**
 * Get the post-expiry access policy for a tier.
 * Defaults to "readonly" if not configured.
 */
export function getPostExpiryAccess(
  tier: Tier | string | null | undefined,
): "readonly" | "delete" {
  return (
    getValue<"readonly" | "delete">(tier, "postExpiryAccess") ?? "readonly"
  );
}
