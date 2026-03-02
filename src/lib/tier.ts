/**
 * Tier utilities — single place for plan/tier resolution and BASIC (and future STANDARD/PRO) checks.
 * Use getResolvedTier() whenever reading festival.tier so fallback behavior is consistent.
 */

import type { Tier } from "@prisma/client";

/** Default tier when festival.tier is null/undefined (e.g. legacy data). Conservative: BASIC. */
export const DEFAULT_TIER: Tier = "BASIC";

/**
 * Resolves nullable tier to a Tier. Use everywhere we read festival.tier for limits/features.
 */
export function getResolvedTier(
  tier: Tier | null | undefined,
): Tier {
  return tier ?? DEFAULT_TIER;
}

/** True when plan is BASIC (used for BASIC-only UI/limits). */
export function isBasicTier(tier: Tier | null | undefined): boolean {
  return getResolvedTier(tier) === "BASIC";
}

/** True when plan is STANDARD or higher (for future STANDARD/PRO feature gating). */
export function isStandardOrAbove(tier: Tier | null | undefined): boolean {
  const t = getResolvedTier(tier);
  return t === "STANDARD" || t === "PRO";
}

/** True when plan is PRO (for future PRO-only features). */
export function isProTier(tier: Tier | null | undefined): boolean {
  return getResolvedTier(tier) === "PRO";
}
