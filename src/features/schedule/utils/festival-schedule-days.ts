import { eachDayOfInterval } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { DEFAULT_TZ } from "@/core/datetime/constants";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar day keys (yyyy-MM-dd) for each day in the festival range,
 * computed in the festival's timezone. Uses `fromZonedTime` to convert
 * the wall-clock boundaries to UTC, then expands the interval with
 * date-fns so DST jumps still produce one key per local day.
 */
export function getFestivalDateKeySet(
  startISO: string | null,
  endISO: string | null,
  tz: string = DEFAULT_TZ,
): Set<string> | null {
  if (!startISO || !endISO) return null;
  const startParsed = new Date(startISO);
  const endParsed = new Date(endISO);
  if (
    Number.isNaN(startParsed.getTime()) ||
    Number.isNaN(endParsed.getTime())
  ) {
    return null;
  }
  const startKey = formatInTimeZone(startParsed, tz, "yyyy-MM-dd");
  const endKey = formatInTimeZone(endParsed, tz, "yyyy-MM-dd");
  if (startKey > endKey) return null;
  const startUtc = fromZonedTime(`${startKey}T00:00:00`, tz);
  const endUtc = fromZonedTime(`${endKey}T23:59:59`, tz);
  const days = eachDayOfInterval({
    start: toZonedTime(startUtc, tz),
    end: toZonedTime(endUtc, tz),
  });
  return new Set(days.map((d) => formatInTimeZone(d, tz, "yyyy-MM-dd")));
}

export function isValidScheduleDayKey(key: string): boolean {
  return DAY_KEY_RE.test(key.trim());
}

/**
 * Compare two `Date` values on the calendar day in the festival's timezone.
 * Falls back to local-day semantics when `tz` is omitted.
 */
export function isSameCalendarDay(
  startTime: Date,
  endTime: Date | null,
  tz: string = DEFAULT_TZ,
): boolean {
  if (endTime == null) return true;
  const aKey = formatInTimeZone(startTime, tz, "yyyy-MM-dd");
  const bKey = formatInTimeZone(endTime, tz, "yyyy-MM-dd");
  return aKey === bKey;
}
