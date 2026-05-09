import { parseStoredInstant, toDateOrNull } from "@/core/utils/date-time";

/**
 * Festival lifecycle status (READY, ONGOING, PAST, EXPIRED).
 * EXPIRED is set by the expiration cron; others can be derived from dates for display.
 */

export type DerivedFestivalStatus = "READY" | "ONGOING" | "PAST" | "EXPIRED";

export interface FestivalForStatus {
  status: string;
  createdAt?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  expiresAt?: Date | string | null;
}

/**
 * Derives display status from festival dates and stored status.
 * Use for UI; EXPIRED is authoritative from DB when set by cron.
 * ONGOING is only when now is strictly between startDate and endDate (inclusive of both).
 */
export function getDerivedFestivalStatus(
  festival: FestivalForStatus,
): DerivedFestivalStatus {
  const now = new Date();
  const status = festival.status as DerivedFestivalStatus;

  if (status === "EXPIRED") return "EXPIRED";
  if (festival.expiresAt && parseStoredInstant(festival.expiresAt) <= now) {
    return "EXPIRED";
  }
  const startDate = toDateOrNull(festival.startDate);
  const endDate = toDateOrNull(festival.endDate);
  if (endDate && now > endDate) return "PAST";
  // ONGOING only when we have both dates and now is inside [startDate, endDate]
  if (startDate && endDate && now >= startDate && now <= endDate) {
    return "ONGOING";
  }
  return "READY";
}

export const FESTIVAL_STATUS_LABELS: Record<DerivedFestivalStatus, string> = {
  READY: "Ready",
  ONGOING: "Ongoing",
  PAST: "Past",
  EXPIRED: "Expired",
};

function toDate(value?: Date | string | null): Date | null {
  return toDateOrNull(value);
}

function daysUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format Date as dd/MM/yy.
 */
export function formatFestivalDateDDMMYY(value?: Date | string | null): string {
  const date = toDate(value);
  if (!date) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Compact countdown text used in navbar/status badges.
 */
export function getFestivalStatusCountdownText(
  status: DerivedFestivalStatus,
  festival: Pick<FestivalForStatus, "startDate" | "endDate" | "expiresAt">,
): string | null {
  const now = new Date();
  const startDate = toDate(festival.startDate);
  const endDate = toDate(festival.endDate);
  const expiresAt = toDate(festival.expiresAt);

  if (status === "READY" && startDate) {
    const d = daysUntil(startDate, now);
    if (d > 0) return `${d}d to start`;
    if (d === 0) return "Starts today";
    return `Started ${Math.abs(d)}d ago`;
  }

  if (status === "ONGOING" && endDate) {
    const d = daysUntil(endDate, now);
    if (d > 0) return `${d}d left`;
    if (d === 0) return "Ends today";
    return `Ended ${Math.abs(d)}d ago`;
  }

  if (status === "PAST" && expiresAt) {
    const d = daysUntil(expiresAt, now);
    if (d > 0) return `${d}d to expire`;
    if (d === 0) return "Expires today";
    return `Expired ${Math.abs(d)}d ago`;
  }

  if (status === "EXPIRED" && expiresAt) {
    const d = daysUntil(expiresAt, now);
    if (d < 0) return `Expired ${Math.abs(d)}d ago`;
    if (d === 0) return "Expired today";
    return `${d}d to expire`;
  }

  return null;
}
