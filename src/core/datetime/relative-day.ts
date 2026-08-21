import { MS } from "./constants";
import { dateKeyLocal } from "./wall-clock";

/**
 * Whether a given date falls on today, yesterday, tomorrow, or some other
 * day — relative to the *calendar day* in browser-local time.
 *
 *   relativeDayKey(new Date())  // → "TODAY"
 */
export type RelativeDay = "TODAY" | "YESTERDAY" | "TOMORROW" | "OTHER";

export function relativeDayKey(
  date: Date,
  /** @deprecated ignored — comparison is browser-local. */
  _tz?: string,
): RelativeDay {
  const targetKey = dateKeyLocal(date);
  const now = new Date();
  const todayKey = dateKeyLocal(now);
  if (targetKey === todayKey) return "TODAY";

  const yesterday = new Date(now.getTime() - MS.day);
  const tomorrow = new Date(now.getTime() + MS.day);
  if (dateKeyLocal(yesterday) === targetKey) return "YESTERDAY";
  if (dateKeyLocal(tomorrow) === targetKey) return "TOMORROW";
  return "OTHER";
}

/**
 * Human-readable label for a relative day. Hardcoded English — the rest
 * of the UI strings in this codebase are also English so far; revisit
 * when i18n lands.
 */
export function relativeDayLabel(rel: RelativeDay): string {
  switch (rel) {
    case "TODAY":
      return "Today";
    case "YESTERDAY":
      return "Yesterday";
    case "TOMORROW":
      return "Tomorrow";
    case "OTHER":
      return "Other";
  }
}

/**
 * Return a `Date` that represents midnight (00:00:00) of the calendar day
 * `date` falls on, in browser-local time. Equivalent to
 * `new Date(date.getFullYear(), date.getMonth(), date.getDate())`.
 */
export function midnightInTz(
  date: Date,
  /** @deprecated ignored — operation is browser-local. */
  _tz?: string,
): Date {
  const key = dateKeyLocal(date);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
