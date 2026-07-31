import { DATE_ONLY, ISO_INSTANT_WITH_TZ, TIMESTAMP_NO_TZ } from "./constants";

/**
 * Configuration for `parseInstant`. Optional second argument; the
 * legacy coercion rule is captured here so callers can opt into stricter
 * parsing on non-UTC deployments.
 */
export interface ParseInstantOptions {
  /**
   * How to interpret Postgres-style timestamps written without an explicit
   * timezone (e.g. `"2026-08-15 09:00:00.000"`).
   *
   * - `"utc"` (default): append `Z` and parse. Matches every Vercel
   *   deployment and every existing row written via `serverNowIso()`.
   * - `"reject"`: return `null` for these inputs. Use on non-UTC
   *   deployments where appending `Z` would silently drift the display.
   */
  legacyLocalFormat?: "utc" | "reject";
}

/**
 * Parse any string / Date / nullish value into a `Date` (UTC instant).
 *
 * Convention: all stored instants are UTC, regardless of input shape.
 *   - `"2026-08-15T09:00:00.000Z"`             → as-is
 *   - `"2026-08-15T09:00:00.000+05:30"`        → as-is
 *   - `"2026-08-15T09:00:00.000"`              → assumed UTC, parsed as Z
 *   - `"2026-08-15 09:00:00.000"`              → space-separator normalised, assumed UTC
 *   - `"2026-08-15"`                           → midnight UTC
 *   - `Date` object                            → cloned (if valid; null if NaN)
 *   - `null` / `undefined` / `""`              → `null`
 *   - invalid string                           → `null`
 *
 * The `Date` `NaN`-getTime case is intentionally converted to `null`
 * rather than passed through, so downstream math (e.g. `daysUntil`)
 * never sees a `NaN` value.
 */
export function parseInstant(
  value: string | Date | null | undefined,
  options: ParseInstantOptions = {},
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const raw = String(value).trim();
  if (raw === "") return null;

  // Already Z-suffixed or has an explicit ±HH:MM offset.
  if (ISO_INSTANT_WITH_TZ.test(raw)) {
    return safeToDate(raw);
  }

  // Postgres-style "YYYY-MM-DD HH:mm:ss(.SSS)?" without TZ.
  if (TIMESTAMP_NO_TZ.test(raw)) {
    if (options.legacyLocalFormat === "reject") return null;
    return safeToDate(coerceLegacyLocalFormatToUtc(raw));
  }

  // Date-only "YYYY-MM-DD" → midnight UTC.
  if (DATE_ONLY.test(raw)) {
    return safeToDate(`${raw}T00:00:00.000Z`);
  }

  return null;
}

/**
 * Convert a Postgres-style timestamp without TZ into an ISO instant
 * string by replacing the space separator with `T` and appending `Z`.
 * Lives in a named helper so the "we assume UTC for legacy local-format
 * rows" rule is explicit and discoverable.
 */
function coerceLegacyLocalFormatToUtc(raw: string): string {
  const normalised = raw.includes("T") ? raw : raw.replace(" ", "T");
  return `${normalised}Z`;
}

/**
 * Final NaN-check wrapper around `new Date(...)`. Centralises the
 * "an invalid date string passed the regex but not the parser" path so
 * every coercion flow yields `null` instead of an instance with
 * `getTime() === NaN`.
 */
function safeToDate(candidate: string): Date | null {
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Same as `parseInstant` but throws on invalid input. Use when the
 * caller has already validated the input exists.
 */
export function parseInstantOrThrow(
  value: string | Date,
  options?: ParseInstantOptions,
): Date {
  const result = parseInstant(value, options);
  if (result === null) {
    throw new Error(`[datetime] Cannot parse instant: ${String(value)}`);
  }
  return result;
}

/**
 * Convenience wrapper that returns `null` for invalid input. Equivalent
 * to `parseInstant` but reads more clearly at call sites that handle
 * `Date | null` directly.
 */
export function toDateOrNull(
  value: string | Date | null | undefined,
  options?: ParseInstantOptions,
): Date | null {
  return parseInstant(value, options);
}
