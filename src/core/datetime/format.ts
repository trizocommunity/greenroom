import { formatDistanceToNow as fnsFormatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { DEFAULT_TZ, FALLBACK_DISPLAY } from "./constants";
import { parseInstant } from "./parse";

type Style = "short" | "medium" | "long";

interface DateOpts {
  tz?: string;
  style?: Style;
  locale?: string;
}

interface TimeOpts {
  tz?: string;
  style?: "short" | "medium";
  locale?: string;
}

interface DateTimeOpts {
  tz?: string;
  dateStyle?: Style;
  timeStyle?: "short" | "medium";
  locale?: string;
}

function safeFormat(
  value: string | Date | null | undefined,
  formatter: (date: Date, tz: string) => string,
): string {
  const date = parseInstant(value);
  if (date === null) return FALLBACK_DISPLAY;
  try {
    return formatter(date, DEFAULT_TZ);
  } catch {
    return FALLBACK_DISPLAY;
  }
}

function applyTz(tz?: string): string {
  return tz && tz.length > 0 ? tz : DEFAULT_TZ;
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
 * Format a stored instant as a date-only string in the given timezone.
 *
 *   formatDate("2026-08-15T18:30:00.000Z", { tz: "Asia/Kolkata" })
 *   // → "16 Aug 2026"
 */
export function formatDate(
  value: string | Date | null | undefined,
  opts: DateOpts = {},
): string {
  const tz = applyTz(opts.tz);
  return safeFormat(value, (date, _tz) =>
    formatInTimeZone(date, tz, DATE_PATTERNS[opts.style ?? "medium"]),
  );
}

/**
 * Format a stored instant as a time-only string in the given timezone.
 */
export function formatTime(
  value: string | Date | null | undefined,
  opts: TimeOpts = {},
): string {
  const tz = applyTz(opts.tz);
  return safeFormat(value, (date, _tz) =>
    formatInTimeZone(date, tz, TIME_PATTERNS[opts.style ?? "short"]),
  );
}

/**
 * Format a stored instant as both date and time in the given timezone.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  opts: DateTimeOpts = {},
): string {
  const tz = applyTz(opts.tz);
  const pattern = DATE_TIME_PATTERNS[opts.dateStyle ?? "medium"];
  return safeFormat(value, (date, _tz) => formatInTimeZone(date, tz, pattern));
}

/**
 * Format the distance between `value` and `base` (default: now) using
 * date-fns `formatDistanceToNow`. Negative offsets → "ago"; positive
 * offsets → "in X". Returns `FALLBACK_DISPLAY` on invalid input.
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
      return fnsFormatDistanceToNow(date, { addSuffix: true });
    } catch {
      return FALLBACK_DISPLAY;
    }
  }

  const baseDate = parseInstant(base);
  if (baseDate === null) return FALLBACK_DISPLAY;

  const diffMs = date.getTime() - baseDate.getTime();
  const direction = diffMs >= 0 ? "future" : "past";
  try {
    const text = fnsFormatDistanceToNow(
      direction === "future" ? date : baseDate,
      { addSuffix: false },
    );
    return direction === "future" ? `in ${text}` : `${text} ago`;
  } catch {
    return FALLBACK_DISPLAY;
  }
}
