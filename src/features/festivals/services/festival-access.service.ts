import { TIER_CONFIG } from "@/config/pricing";
import type { festival as festivals } from "@/core/database/schema";
import type { FeaturePath } from "@/features/plan-features/services/features";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";

type FestivalRow = typeof festivals.$inferSelect;

export function isFestivalActive(
  festival: Pick<FestivalRow, "status" | "expiresAt">,
) {
  const now = new Date();
  if (festival.status === "EXPIRED") return false;
  if (festival.expiresAt && festival.expiresAt < new Date().toISOString())
    return false;
  return true;
}

export function canUseFeature(
  festival: Pick<FestivalRow, "tier">,
  feature: FeaturePath,
) {
  const tier = getTierForFeatureCheck(festival.tier);
  return FeatureService.isFeatureEnabled(tier, feature);
}

export function getTierLimits(festival: Pick<FestivalRow, "tier">) {
  const tier = getResolvedTier(festival.tier);
  return TIER_CONFIG[tier].limits;
}
