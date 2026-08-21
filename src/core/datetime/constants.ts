import { sql } from "drizzle-orm";

/**
 * Sentinel returned by formatters when the input cannot be parsed.
 * Centralised so consumers can check with `=== FALLBACK_DISPLAY`.
 */
export const FALLBACK_DISPLAY = "—" as const;

/**
 * Single source of truth for `createdAt` / `updatedAt` defaults in Drizzle.
 * Using `CURRENT_TIMESTAMP` means the Postgres clock wins — eliminating
 * drift between Node and DB clocks. Use this in every `default(...)`.
 */
export function currentTimestampSql() {
  return sql`CURRENT_TIMESTAMP`;
}

/**
 * Regex matching a fully-formed ISO instant with timezone:
 *   2026-08-15T09:00:00.000Z
 *   2026-08-15T09:00:00+05:30
 *   2026-08-15T09:00:00.000-04:00
 */
export const ISO_INSTANT_WITH_TZ =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * Regex matching a Postgres-style timestamp without explicit TZ:
 *   2026-08-15 09:00:00.000
 *   2026-08-15T09:00:00.000
 * Treated as UTC (the canonical storage convention).
 */
export const TIMESTAMP_NO_TZ =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/;

/**
 * Regex matching an ISO calendar date (YYYY-MM-DD).
 */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Common time durations in milliseconds. Centralised to avoid magic numbers.
 */
export const MS = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
} as const;