import { parseInstant } from "@/core/datetime";

/**
 * Build a Date from the organizer's date + time inputs (browser local wall clock).
 * Avoids `new Date("YYYY-MM-DDTHH:mm")` which is parsed as UTC in some runtimes
 * and shifts the instant (e.g. 9:00 → wrong UTC / wrong display).
 */
export function localWallClockToDate(
  dateYYYYMMDD: string,
  timeHHmm: string,
): Date {
  const ymd = dateYYYYMMDD.split("-").map((x) => parseInt(x, 10));
  const y = ymd[0]!;
  const mo = ymd[1]!;
  const d = ymd[2]!;
  const parts = timeHHmm.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const mi = parseInt(parts[1] ?? "0", 10);
  const sec = parts[2] != null ? parseInt(parts[2], 10) : 0;
  if ([y, mo, d, h, mi, sec].some((n) => Number.isNaN(n) || n === undefined)) {
    return new Date(NaN);
  }
  return new Date(y, mo - 1, d, h, mi, sec, 0);
}

/**
 * Parse schedule_entry timestamps from the DB.
 *
 * Rows are written with `toISOString()` (UTC) and the canonical
 * `parseInstant` helper accepts every realistic wire shape the DB
 * can emit — Z-suffixed ISO, ±HH:MM offset, ±00 zero-offset,
 * space-separated Postgres-style without TZ, etc.
 *
 * Returns `new Date(NaN)` for genuinely unparseable or missing input
 * so existing callers that use `.getTime()` arithmetic keep working
 * (NaN propagates harmlessly). Prefer `parseInstant()` directly if
 * you can handle `Date | null`.
 */
export function parseStoredScheduleInstant(
  value: string | Date | null | undefined,
): Date {
  const parsed = parseInstant(value);
  if (parsed === null) return new Date(NaN);
  return parsed;
}
