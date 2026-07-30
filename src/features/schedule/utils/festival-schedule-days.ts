import { eachDayOfInterval, format, isSameDay, startOfDay } from "date-fns";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar day keys (yyyy-MM-dd) for each day in the festival range, same logic as schedule date pickers. */
export function getFestivalDateKeySet(
  startISO: string | null,
  endISO: string | null,
): Set<string> | null {
  if (!startISO || !endISO) return null;
  const start = startOfDay(new Date(startISO));
  const end = startOfDay(new Date(endISO));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (start > end) return null;
  const days = eachDayOfInterval({ start, end });
  return new Set(days.map((d) => format(d, "yyyy-MM-dd")));
}

export function isValidScheduleDayKey(key: string): boolean {
  return DAY_KEY_RE.test(key.trim());
}

/** Start and optional end must fall on the same calendar day (organizer-local dates). */
export function isSameCalendarDay(
  startTime: Date,
  endTime: Date | null,
): boolean {
  if (endTime == null) return true;
  return isSameDay(startTime, endTime);
}
