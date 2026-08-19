import { eachDayOfInterval } from "date-fns";
import { parseInstant } from "@/core/datetime/parse";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar day keys (yyyy-MM-dd) for each day in the festival range,
 * in the viewer's browser-local timezone. Browsing the festival — admin
 * or public — is always done in the user's local clock, so day grouping
 * uses local days.
 */
export function getFestivalDateKeySet(
  startISO: string | null,
  endISO: string | null,
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
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const startKey = fmt.format(startParsed);
  const endKey = fmt.format(endParsed);
  if (startKey > endKey) return null;

  // Expand the interval using the local midnight of each boundary so
  // every local day the festival spans gets its own key.
  const startLocalMidnight = new Date(
    startParsed.getFullYear(),
    startParsed.getMonth(),
    startParsed.getDate(),
  );
  const endLocalMidnight = new Date(
    endParsed.getFullYear(),
    endParsed.getMonth(),
    endParsed.getDate(),
    23,
    59,
    59,
    999,
  );

  const days = eachDayOfInterval({
    start: startLocalMidnight,
    end: endLocalMidnight,
  });
  return new Set(days.map((d) => fmt.format(d)));
}

export function getScheduleDateKeyUpperBound(
  endDate: string | null,
): string | null {
  if (!endDate) return null;
  const parsed = parseInstant(endDate);
  if (!parsed) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(parsed);
}

export function isValidScheduleDayKey(key: string): boolean {
  return DAY_KEY_RE.test(key.trim());
}

/**
 * Compare two `Date` values on the calendar day in the viewer's
 * browser-local timezone.
 */
export function isSameCalendarDay(startTime: Date, endTime: Date | null): boolean {
  if (endTime == null) return true;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(startTime) === fmt.format(endTime);
}