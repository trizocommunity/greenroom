import type { Tier } from "@/core/types/app-enums";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";

export type LeaderboardResultView = "desk" | "onAir" | "standings";

export type LeaderboardResultLike = {
  isPublished?: boolean | null;
  isAnnounced?: boolean | null;
};

/**
 * Dashboard leaderboard visibility by plan tier.
 *
 * - BASIC `standings`: published only
 * - Standard/Pro `desk`: published only
 * - Standard/Pro `onAir`: published and announced
 */
export function isResultVisibleForLeaderboard(
  result: LeaderboardResultLike,
  tier: Tier | string | null | undefined,
  view: LeaderboardResultView,
): boolean {
  const resolved = getResolvedTier(tier);
  const published = Boolean(result.isPublished);
  const announced = Boolean(result.isAnnounced);

  if (isBasicTier(resolved)) {
    return view === "standings" && published;
  }

  if (view === "desk") {
    return published;
  }

  if (view === "onAir") {
    return published && announced;
  }

  // standings view on Standard/Pro: treat as on-air (published + announced)
  return published && announced;
}

export function filterResultsForLeaderboard<T extends LeaderboardResultLike>(
  results: T[],
  tier: Tier | string | null | undefined,
  view: LeaderboardResultView,
): T[] {
  return results.filter((r) => isResultVisibleForLeaderboard(r, tier, view));
}

export function getParticipantLeaderboardView(
  tier: Tier | string | null | undefined,
): LeaderboardResultView {
  return isBasicTier(tier) ? "standings" : "onAir";
}

export function getTeamDeskLeaderboardView(
  tier: Tier | string | null | undefined,
): LeaderboardResultView {
  return isBasicTier(tier) ? "standings" : "desk";
}
