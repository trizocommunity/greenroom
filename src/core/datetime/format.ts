import { format, formatDistanceToNow } from "date-fns";

import { FALLBACK_DISPLAY } from "./constants";
import { parseInstant } from "./parse";

type Style = "short" | "medium" | "long";

interface DateOpts {
  style?: Style;
  locale?: string;
}

interface TimeOpts {
  style?: "short" | "medium";
  locale?: string;
}

interface DateTimeOpts {
  dateStyle?: Style;
  timeStyle?: "short" | "medium";
  locale?: string;
}

function safeFormat(
  value: string | Date | null | undefined,
  formatter: (date: Date) => string,
): string {
  const date = parseInstant(value);
  if (date === null) return FALLBACK_DISPLAY;
  try {
    return formatter(date);
  } catch {
    return FALLBACK_DISPLAY;
  }
}

const DATE_PATTERNS: Record<Style, string> = {
  short: "dd MMM yyyy",
  medium: "d MMM yyyy",
  long: "EEEE, d MMMM yyyy",
};

const TIME_PATTERNS: Record<"short" | "medium", string> = {
  short: "HH:mm",
  medium: "HH:mm:ss",
};

const DATE_TIME_PATTERNS: Record<Style, string> = {
  short: "dd MMM yyyy",
  medium: "d MMM yyyy HH:mm",
  long: "EEEE, d MMMM yyyy HH:mm:ss",
};

/**
 * Format a stored UTC instant as a date string in the viewer's
 * **browser-local** timezone. Two users viewing the same instant will
 * see the date that matches their wall clock.
 *
 *   formatDate("2026-08-15T18:30:00.000Z")
 *   // viewer in Asia/Kolkata → "16 Aug 2026"
 *   // viewer in UTC         → "15 Aug 2026"
 */
export function formatDate(
  value: string | Date | null | undefined,
  opts: DateOpts = {},
): string {
  return safeFormat(value, (date) =>
    format(date, DATE_PATTERNS[opts.style ?? "medium"]),
  );
}

/**
 * Format a stored UTC instant as a time string in the viewer's
 * browser-local timezone.
 *
 *   formatTime("2026-08-15T18:30:00.000Z")
 *   // viewer in IST → "00:00" (next day, so date shifts; time does too)
 *   // viewer in UTC → "18:30"
 */
export function formatTime(
  value: string | Date | null | undefined,
  opts: TimeOpts = {},
): string {
  return safeFormat(value, (date) =>
    format(date, TIME_PATTERNS[opts.style ?? "short"]),
  );
}

/**
 * Format a stored UTC instant as a date + time string in the viewer's
 * browser-local timezone.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  opts: DateTimeOpts = {},
): string {
  return safeFormat(value, (date) =>
    format(date, DATE_TIME_PATTERNS[opts.dateStyle ?? "medium"]),
  );
}

/**
 * Format the distance between `value` and `base` (default: now).
 * Negative offsets → "ago"; positive offsets → "in X".
 * Returns `FALLBACK_DISPLAY` on invalid input.
 *
 *   formatRelative("2026-08-15T09:00:00.000Z", baseIso)
 *   // → "2 hours ago"
 */
export function formatRelative(
  value: string | Date | null | undefined,
  base?: string | Date,
): string {
  const date = parseInstant(value);
  if (date === null) return FALLBACK_DISPLAY;

  if (base === undefined) {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return FALLBACK_DISPLAY;
    }
  }

  const baseDate = parseInstant(base);
  if (baseDate === null) return FALLBACK_DISPLAY;

  const diffMs = date.getTime() - baseDate.getTime();
  const direction = diffMs >= 0 ? "future" : "past";
  try {
    const text = formatDistanceToNow(
      direction === "future" ? date : baseDate,
      { addSuffix: false },
    );
    return direction === "future" ? `in ${text}` : `${text} ago`;
  } catch {
    return FALLBACK_DISPLAY;
  }
}