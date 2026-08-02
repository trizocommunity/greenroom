/**
 * In-app expiry banner — pure helper functions that derive banner state
 * from a festival row.
 *
 * Banner visibility is decided on the server (in the dashboard layout) by
 * inspecting `festival.expiresAt`. Per-user dismissal is tracked in
 * localStorage on the client (`ExpiryWarningBanner.tsx`) — there is no
 * server-side persistence yet because the warning re-fires every festival
 * lifetime and the cron-driven email already covers the durable channel.
 */

import { parseInstant } from "@/core/datetime";
import { MS, serverNow } from "@/core/datetime/server";

const PRE_ARCHIVAL_DAYS = 7;

export interface BannerState {
  visible: boolean;
  daysRemaining: number | null;
  expiresAtIso: string | null;
}

export interface FestivalLikeForBanner {
  expiresAt: string | null;
  status: string | null;
}

export function getInAppBannerState(
  festival: FestivalLikeForBanner,
): BannerState {
  if (!festival.expiresAt || festival.status === "EXPIRED") {
    return { visible: false, daysRemaining: null, expiresAtIso: null };
  }
  const expiry = parseInstant(festival.expiresAt);
  if (!expiry) {
    return { visible: false, daysRemaining: null, expiresAtIso: null };
  }
  const now = serverNow();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs < 0) {
    return {
      visible: false,
      daysRemaining: null,
      expiresAtIso: festival.expiresAt,
    };
  }
  const daysRemaining = Math.ceil(diffMs / MS.day);
  const visible = daysRemaining <= PRE_ARCHIVAL_DAYS;
  return {
    visible,
    daysRemaining,
    expiresAtIso: festival.expiresAt,
  };
}
