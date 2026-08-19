import { format } from "date-fns";

import { DATE_ONLY } from "./constants";
import { parseInstant } from "./parse";

export interface WallClockParts {
  yyyymmdd: string;
  hhmm: string;
}

/**
 * Convert a wall-clock date (and optional time) entered by the user in
 * their browser's local time into a stored UTC ISO instant string.
 *
 *   wallClockToInstant("2026-08-15", "09:00")
 *   // user's browser in IST → "2026-08-15T03:30:00.000Z"
 *   // user's browser in UTC → "2026-08-15T09:00:00.000Z"
 *
 * The user's browser timezone is the only authority for "what time did
 * they pick". This deliberately does NOT take a tz parameter — every
 * caller should mean "the time the user just typed in their browser".
 */
export function wallClockToInstant(
  yyyymmdd: string,
  hhmm: string | undefined,
): string {
  if (!DATE_ONLY.test(yyyymmdd)) {
    throw new Error(
      `[datetime] wallClockToInstant: invalid date "${yyyymmdd}" (expected YYYY-MM-DD)`,
    );
  }
  const timePart = hhmm && hhmm.length > 0 ? hhmm : "00:00";
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(timePart)) {
    throw new Error(
      `[datetime] wallClockToInstant: invalid time "${hhmm}" (expected HH:mm)`,
    );
  }
  const [hh, mi, ss] = timePart.split(":");
  const seconds = ss ?? "00";
  // `T` (no Z) tells the Date constructor to interpret the string in
  // the browser's local timezone. `.toISOString()` then converts to UTC.
  const localWallClock = `${yyyymmdd}T${hh.padStart(2, "0")}:${mi}:${seconds}`;
  const utcDate = new Date(localWallClock);
  return utcDate.toISOString();
}

/**
 * Inverse of `wallClockToInstant`: given a UTC ISO instant, return the
 * wall-clock date and time in the browser's local timezone.
 *
 *   instantToWallClockParts("2026-08-15T03:30:00.000Z")
 *   // user's browser in IST → { yyyymmdd: "2026-08-15", hhmm: "09:00" }
 */
export function instantToWallClockParts(iso: string | Date): WallClockParts {
  const date = parseInstant(iso);
  if (date === null) {
    throw new Error(`[datetime] instantToWallClockParts: invalid input`);
  }
  return {
    yyyymmdd: format(date, "yyyy-MM-dd"),
    hhmm: format(date, "HH:mm"),
  };
}

/**
 * Return the browser-local day key (`YYYY-MM-DD`) for the given instant.
 * Two instants that fall on the same calendar day in the user's
 * browser → same key.
 *
 *   dateKeyLocal("2026-08-15T18:30:00.000Z")
 *   // user's browser in IST → "2026-08-16"
 *   // user's browser in UTC → "2026-08-15"
 *
 * Used to compare calendar days (e.g. DOB login, today/yesterday
 * bucketing). The browser timezone is the authority — no override.
 */
export function dateKeyLocal(value: string | Date): string {
  const date = parseInstant(value);
  if (date === null) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Return the UTC day key (`YYYY-MM-DD`) — always in UTC, regardless of
 * browser timezone. Used for stable, timezone-independent grouping
 * (analytics, server-side bucketing, expiry checks).
 */
export function dateKeyUTC(value: string | Date): string {
  const date = parseInstant(value);
  if (date === null) return "";
  // Force UTC for the format — date-fns' `format()` reads the *local*
  // time of the Date, but we want the canonical UTC bucket.
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * Given a Date that represents the wall-clock day the user picked in
 * their browser (e.g. `new Date(2026, 7, 15)` from `react-day-picker`,
 * which the picker always emits in local time), return the same day as
 * `YYYY-MM-DD` in the browser's local timezone.
 *
 *   zonedDayKey(new Date(2026, 7, 15, 0, 0))
 *   // → "2026-08-15"  (regardless of browser tz — the input is already
 *                     //   the user's local day)
 *
 * Round-trip companion to `wallClockToInstant`.
 */
export function zonedDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}