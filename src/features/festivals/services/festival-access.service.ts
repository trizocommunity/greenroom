import { TIER_CONFIG } from "@/config/pricing";
import type { festival as festivals } from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import type { BooleanFeaturePath } from "@/features/plan-features/services/feature-gate";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { getResolvedTier } from "@/features/plan-features/services/tier";

type FestivalRow = typeof festivals.$inferSelect;

export function isFestivalActive(
  festival: Pick<FestivalRow, "status" | "expiresAt">,
) {
  if (festival.status === "EXPIRED") return false;
  if (isExpired(festival.expiresAt)) return false;
  return true;
}

export function canUseFeature(
  festival: Pick<FestivalRow, "tier">,
  feature: BooleanFeaturePath,
) {
  return isEnabled(festival.tier, feature);
}

export function getTierLimits(festival: Pick<FestivalRow, "tier">) {
  const tier = getResolvedTier(festival.tier);
  return TIER_CONFIG[tier].limits;
}
