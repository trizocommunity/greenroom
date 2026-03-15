/**
 * Festival lifecycle status (READY, ONGOING, PAST, EXPIRED).
 * EXPIRED is set by the expiration cron; others can be derived from dates for display.
 */

export type DerivedFestivalStatus = "READY" | "ONGOING" | "PAST" | "EXPIRED";

export interface FestivalForStatus {
  status: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  expiresAt?: Date | string | null;
}

/**
 * Derives display status from festival dates and stored status.
 * Use for UI; EXPIRED is authoritative from DB when set by cron.
 */
export function getDerivedFestivalStatus(
  festival: FestivalForStatus,
): DerivedFestivalStatus {
  const now = new Date();
  const status = festival.status as DerivedFestivalStatus;

  if (status === "EXPIRED") return "EXPIRED";
  if (
    festival.expiresAt &&
    new Date(festival.expiresAt) <= now
  ) {
    return "EXPIRED";
  }
  const endDate = festival.endDate ? new Date(festival.endDate) : null;
  const startDate = festival.startDate ? new Date(festival.startDate) : null;
  if (endDate && now > endDate) return "PAST";
  if (
    startDate &&
    endDate &&
    now >= startDate &&
    now <= endDate
  ) {
    return "ONGOING";
  }
  return "READY";
}

export const FESTIVAL_STATUS_LABELS: Record<
  DerivedFestivalStatus,
  string
> = {
  READY: "Ready",
  ONGOING: "Ongoing",
  PAST: "Past",
  EXPIRED: "Expired",
};
