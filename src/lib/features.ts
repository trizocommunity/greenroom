/**
 * Feature Service
 *
 * Provides type-safe feature flag checking for tier-based access control.
 * This service should be used for both server-side and client-side feature checks.
 *
 * @example
 * // Check if a feature is enabled
 * const canExport = FeatureService.isFeatureEnabled('BASIC', 'excelExport');
 *
 * // Get a feature value
 * const maxMembers = FeatureService.getFeatureValue<number>('BASIC', 'maxTeamMembers');
 */

import type { Tier } from "@prisma/client";
import type { TierFeatures } from "@/config/pricing";
import { TIER_CONFIG } from "@/config/pricing";
import { getResolvedTier } from "@/lib/tier";

/** Derived from TierFeatures so config and feature paths cannot drift. */
export type FeaturePath = keyof TierFeatures;

/**
 * Coerce nullable tier to Tier for feature checks. Use before isFeatureEnabled/getFeatureValue.
 * Delegates to tier.ts for consistent default (BASIC).
 * Accepts string for loaders/API that return tier as string.
 */
export function getTierForFeatureCheck(
  tier: Tier | string | null | undefined,
): Tier {
  return getResolvedTier(tier as Tier | null | undefined);
}

function isFeatureEnabled(tier: Tier, featurePath: FeaturePath): boolean {
  try {
    const features = TIER_CONFIG[tier]?.features;
    if (!features) {
      console.warn(`[FeatureService] No features found for tier: ${tier}`);
      return false;
    }

    const value = features[featurePath];

    if (value === undefined) {
      console.warn(
        `[FeatureService] Feature '${featurePath}' not defined for tier ${tier}`,
      );
      return false;
    }

    return Boolean(value);
  } catch (error) {
    console.error(
      `[FeatureService] Error checking feature '${featurePath}' for tier ${tier}:`,
      error,
    );
    return false;
  }
}

function getFeatureValue<T = any>(
  tier: Tier,
  featurePath: FeaturePath,
): T | null {
  try {
    const features = TIER_CONFIG[tier]?.features;
    if (!features) {
      console.warn(`[FeatureService] No features found for tier: ${tier}`);
      return null;
    }

    const value = features[featurePath];

    if (value === undefined) {
      console.warn(
        `[FeatureService] Feature '${featurePath}' not defined for tier ${tier}`,
      );
      return null;
    }

    return value as T;
  } catch (error) {
    console.error(
      `[FeatureService] Error getting feature value '${featurePath}' for tier ${tier}:`,
      error,
    );
    return null;
  }
}

function hasSupportLevel(
  tier: Tier,
  requiredLevel: "whatsapp" | "priority" | "premium",
): boolean {
  const supportLevels = ["whatsapp", "priority", "premium"];
  const tierLevel = getFeatureValue<string>(tier, "supportLevel");

  if (!tierLevel) return false;

  const tierLevelIndex = supportLevels.indexOf(tierLevel);
  const requiredLevelIndex = supportLevels.indexOf(requiredLevel);

  return tierLevelIndex >= requiredLevelIndex;
}

function getMaxTeamMembers(tier: Tier): number {
  return getFeatureValue<number>(tier, "maxTeamMembers") ?? 0;
}

function hasUnlimitedTeamMembers(tier: Tier): boolean {
  return getMaxTeamMembers(tier) === -1;
}

function getPostExpiryAccess(tier: Tier): "readonly" | "delete" {
  return (
    getFeatureValue<"readonly" | "delete">(tier, "postExpiryAccess") ??
    "readonly"
  );
}

/** Feature Service - Centralized feature flag management (plain object, not a class). */
export const FeatureService = {
  isFeatureEnabled,
  getFeatureValue,
  hasSupportLevel,
  getMaxTeamMembers,
  hasUnlimitedTeamMembers,
  getPostExpiryAccess,
};
