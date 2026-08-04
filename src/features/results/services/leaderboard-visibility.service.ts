import type { Tier } from "@/core/types/app-enums";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";

export type LeaderboardResultView = "desk" | "onAir" | "standings";

export type LeaderboardResultLike = {
  isPublished?: boolean | null;
};

export function isResultVisibleForLeaderboard(
  result: LeaderboardResultLike,
  tier: Tier | string | null | undefined,
  view: LeaderboardResultView,
): boolean {
  const resolved = getResolvedTier(tier);
  const published = Boolean(result.isPublished);

  if (isBasicTier(resolved)) {
    return view === "standings" && published;
  }

  return published;
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
