import { DATE_ONLY, ISO_INSTANT_WITH_TZ, TIMESTAMP_NO_TZ } from "./constants";

/**
 * Parse any string / Date / nullish value into a `Date` (UTC instant).
 *
 * Convention: all stored instants are UTC, regardless of input shape.
 *   - "2026-08-15T09:00:00.000Z"             → as-is
 *   - "2026-08-15T09:00:00.000+05:30"        → as-is
 *   - "2026-08-15T09:00:00.000"              → assumed UTC, parsed as Z
 *   - "2026-08-15 09:00:00.000"              → space-separator normalised, assumed UTC
 *   - "2026-08-15"                           → midnight UTC
 *   - Date object                            → returned (cloned)
 *   - null / undefined / ""                   → null
 *   - invalid                                → null
 */
export function parseInstant(
  value: string | Date | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const raw = String(value).trim();
  if (raw === "") return null;

  let candidate: string;
  if (ISO_INSTANT_WITH_TZ.test(raw)) {
    candidate = raw;
  } else if (TIMESTAMP_NO_TZ.test(raw)) {
    const normalised = raw.includes("T") ? raw : raw.replace(" ", "T");
    candidate = `${normalised}Z`;
  } else if (DATE_ONLY.test(raw)) {
    candidate = `${raw}T00:00:00.000Z`;
  } else {
    return null;
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Same as `parseInstant` but throws on invalid input. Use when the
 * caller has already validated the input exists.
 */
export function parseInstantOrThrow(value: string | Date): Date {
  const result = parseInstant(value);
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
): Date | null {
  return parseInstant(value);
}
