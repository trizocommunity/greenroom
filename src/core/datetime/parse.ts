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
  /**
   * When `true`, emit a one-shot `console.warn` per unique raw value
   * that fails to parse. Used by the diagnostic round in v0.x to
   * capture what Drizzle / pg actually returns from the DB. Off in
   * production builds where this would be noisy.
   */
  debugUnparseable?: boolean;
}

/**
 * Parse any string / Date / nullish value into a `Date` (UTC instant).
 *
 * Convention: all stored instants are UTC, regardless of input shape.
 *   - `"2026-08-15T09:00:00.000Z"`             → as-is
 *   - `"2026-08-15T09:00:00.000+05:30"`        → as-is
 *   - `"2026-08-15T09:00:00.000+00"`           → normalised to `Z`
 *   - `"2026-08-15T09:00:00.000+0000"`         → normalised to `Z`
 *   - `"2026-08-15T09:00:00.000+00:00"`        → normalised to `Z`
 *   - `"2026-08-15T09:00:00.000"`              → assumed UTC, parsed as Z
 *   - `"2026-08-15 09:00:00.000"`              → space-separator normalised, assumed UTC
 *   - `"2026-08-15"`                           → midnight UTC
 *   - `Date` object                            → cloned (if valid; null if NaN)
 *   - numeric epoch ms (10–13 digits)          → UTC instant
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

  // Normalise ±00 (UTC-zero offset) variants to `Z` so they hit the
  // TZ-aware branch below. This covers the wire formats emitted by
  // Drizzle `mode: "string"` with `timestamptz` (e.g. `+00`, `+00:00`,
  // `+0000`) and the `text` cast of `timestamp(3)` in a UTC session.
  const normalised = normaliseZeroOffsetToZ(raw);

  if (ISO_INSTANT_WITH_TZ.test(normalised)) {
    return safeToDate(normalised);
  }

  // Postgres-style "YYYY-MM-DD HH:mm:ss(.SSS)?" without TZ.
  if (TIMESTAMP_NO_TZ.test(normalised)) {
    if (options.legacyLocalFormat === "reject") return null;
    return safeToDate(coerceLegacyLocalFormatToUtc(normalised));
  }

  // Date-only "YYYY-MM-DD" → midnight UTC.
  if (DATE_ONLY.test(normalised)) {
    return safeToDate(`${normalised}T00:00:00.000Z`);
  }

  // Last-resort fallback: only accept unambiguous numeric epoch ms
  // (13-digit values covering 2001–2286). Anything `Date.parse(...)`
  // would handle browser-locally is rejected to avoid silent TZ drift
  // on non-UTC server deployments.
  if (/^-?\d{13}$/.test(normalised)) {
    // Construct the Date from the numeric value directly — `new Date()`
    // parses a number as epoch ms, but the same number wrapped in a
    // string is interpreted as ISO / RFC2822 depending on shape.
    const asNumber = parseInt(normalised, 10);
    const parsed = new Date(asNumber);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Diagnostic — one warn per unique raw value per process. Lets us
  // capture what Drizzle / pg actually returned at runtime instead of
  // guessing. Off in production unless `debugUnparseable: true` is
  // passed explicitly (only the dev/test paths opt in today).
  if (options.debugUnparseable && !warnedSet.has(normalised)) {
    warnedSet.add(normalised);
    console.warn(
      `[datetime] parseInstant could not parse value: ${JSON.stringify(normalised)} ` +
        `(length=${normalised.length}); returning null. This produces a ` +
        `"${FALLBACK_DISPLAY_STRING}" fallback in format helpers.`,
    );
  }
  return null;
}

const warnedSet = new Set<string>();
const FALLBACK_DISPLAY_STRING = "—";

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
 * Replace any ±HH(:?MM)? zero-offset suffix with a literal `Z`. Empty
 * (no sign, no digits — i.e. no offset at all) is a no-op. Operates
 * case-insensitively to be safe. Keeps the rest of the input intact.
 *
 *   "2026-08-15T09:00:00.000+00"   → "2026-08-15T09:00:00.000Z"
 *   "2026-08-15T09:00:00.000+0000" → "2026-08-15T09:00:00.000Z"
 *   "2026-08-15T09:00:00.000+00:00" → "2026-08-15T09:00:00.000Z"
 *   "2026-08-15 09:00:00.000+00"   → "2026-08-15 09:00:00.000Z"
 *   "2026-08-15T09:00:00.000+05:30" → "2026-08-15T09:00:00.000+05:30" (unchanged)
 */
function normaliseZeroOffsetToZ(raw: string): string {
  return raw.replace(
    /([+-])00(?::?00)?(?=[T ]|\.|$)/,
    () => "Z",
  );
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
