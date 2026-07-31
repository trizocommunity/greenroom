import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { DATE_ONLY, DEFAULT_TZ } from "./constants";
import { parseInstant } from "./parse";

export interface WallClockParts {
  yyyymmdd: string;
  hhmm: string;
}

/**
 * Convert a wall-clock date (and optional time) in a given timezone into
 * a UTC ISO instant string. This is the *only* way to convert an
 * organizer's "9:00 AM on Aug 15 in IST" into a stored UTC instant.
 *
 *   wallClockToInstant("2026-08-15", "09:00", "Asia/Kolkata")
 *   // → "2026-08-15T03:30:00.000Z"
 *
 * If `tz` is omitted, falls back to `DEFAULT_TZ` ("UTC"), which means
 * the caller is opting in to UTC wall-clock semantics.
 *
 * DST-safe: during a forward jump (e.g. 02:30 → 03:30 in `America/New_York`
 * on 2026-03-08), the local time is interpreted in the post-DST offset
 * (03:30 EDT). During a fall-back, ambiguous wall-clock times resolve to
 * the *later* offset.
 */
export function wallClockToInstant(
  yyyymmdd: string,
  hhmm: string | undefined,
  tz: string = DEFAULT_TZ,
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
  const localWallClock = `${yyyymmdd}T${hh.padStart(2, "0")}:${mi}:${seconds}`;
  const utcDate = fromZonedTime(localWallClock, tz);
  return utcDate.toISOString();
}

/**
 * Inverse of `wallClockToInstant`: given a UTC ISO instant and a timezone,
 * return the local wall-clock date and time as separate strings.
 *
 *   instantToWallClockParts("2026-08-15T03:30:00.000Z", "Asia/Kolkata")
 *   // → { yyyymmdd: "2026-08-15", hhmm: "09:00" }
 */
export function instantToWallClockParts(
  iso: string | Date,
  tz: string = DEFAULT_TZ,
): WallClockParts {
  const date = parseInstant(iso);
  if (date === null) {
    throw new Error(`[datetime] instantToWallClockParts: invalid input`);
  }
  const yyyymmdd = formatInTimeZone(date, tz, "yyyy-MM-dd");
  const hhmm = formatInTimeZone(date, tz, "HH:mm");
  return { yyyymmdd, hhmm };
}

/**
 * Return the local-day key (`YYYY-MM-DD`) for the given instant in the
 * given timezone. Two instants on the same local day → same key.
 *
 *   dateKeyLocal("2026-08-15T18:30:00.000Z", "Asia/Kolkata") // "2026-08-16"
 *   dateKeyLocal("2026-08-15T18:30:00.000Z", "UTC")          // "2026-08-15"
 *
 * Used to compare calendar days across timezones (e.g. DOB login).
 */
export function dateKeyLocal(
  value: string | Date,
  tz: string = DEFAULT_TZ,
): string {
  const date = parseInstant(value);
  if (date === null) return "";
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Return the UTC day key (`YYYY-MM-DD`) — always in UTC, regardless of
 * user/festival timezone. Used for stable, timezone-independent grouping
 * (analytics, server-side bucketing).
 */
export function dateKeyUTC(value: string | Date): string {
  const date = parseInstant(value);
  if (date === null) return "";
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

/**
 * Given a Date that represents the wall-clock day the user picked in
 * `tz` (e.g. `new Date(2026, 7, 15)` from `react-day-picker`), return
 * the equivalent wall-clock day as `YYYY-MM-DD` in the same timezone.
 *
 *   zonedDayKey(new Date(2026, 7, 15, 0, 0), "Asia/Kolkata")
 *   // → "2026-08-15"
 *
 * This is the round-trip from picker → DB. Use `wallClockToInstant` if
 * you also need the time-of-day to convert into a UTC instant.
 */
export function zonedDayKey(date: Date, tz: string = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}
