import type { Festival } from "@prisma/client";
import type { FeaturePath } from "@/lib/features";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { TIER_CONFIG } from "@/config/pricing";
import { getResolvedTier } from "@/lib/tier";

export function isFestivalActive(festival: Pick<Festival, "status" | "expiresAt">) {
  const now = new Date();
  if (festival.status === "EXPIRED") return false;
  if (festival.expiresAt && festival.expiresAt < now) return false;
  return true;
}

export function canUseFeature(
  festival: Pick<Festival, "tier">,
  feature: FeaturePath,
) {
  const tier = getTierForFeatureCheck(festival.tier);
  return FeatureService.isFeatureEnabled(tier, feature);
}

export function getTierLimits(festival: Pick<Festival, "tier">) {
  const tier = getResolvedTier(festival.tier);
  return TIER_CONFIG[tier].limits;
}

