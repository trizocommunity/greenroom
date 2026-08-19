import { parseInstant } from "./parse";

/**
 * Return true if `a` is strictly before `b`. Either argument may be a
 * UTC ISO string, a `Date`, or nullish. Nullish → treated as `-Infinity`
 * / `+Infinity` so `isBefore(null, x)` is always true.
 */
export function isBefore(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
): boolean {
  const aDate = parseInstant(a);
  const bDate = parseInstant(b);
  if (aDate === null && bDate === null) return false;
  if (aDate === null) return true;
  if (bDate === null) return false;
  return aDate.getTime() < bDate.getTime();
}

/**
 * Return true if `a` is strictly after `b`. Nullish semantics mirror
 * `isBefore`.
 */
export function isAfter(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
): boolean {
  const aDate = parseInstant(a);
  const bDate = parseInstant(b);
  if (aDate === null && bDate === null) return false;
  if (bDate === null) return true;
  if (aDate === null) return false;
  return aDate.getTime() > bDate.getTime();
}

/**
 * Return true if `iso` represents a moment strictly before `base`
 * (default: `new Date()` server-side or `Date.now()` client-side).
 *
 * `null` / `undefined` / `""` → `false` (treats absence as "not expired"
 * so legacy rows with missing expiry don't suddenly lock users out).
 */
export function isExpired(
  iso: string | Date | null | undefined,
  base: string | Date = new Date(),
): boolean {
  const target = parseInstant(iso);
  if (target === null) return false;
  const baseDate =
    base instanceof Date ? base : (parseInstant(base) ?? new Date());
  return target.getTime() <= baseDate.getTime();
}

/**
 * Milliseconds remaining until `iso`. Negative if already in the past.
 * Returns `0` for nullish input.
 */
export function msUntil(
  iso: string | Date | null | undefined,
  base: string | Date = new Date(),
): number {
  const target = parseInstant(iso);
  if (target === null) return 0;
  const baseDate =
    base instanceof Date ? base : (parseInstant(base) ?? new Date());
  return target.getTime() - baseDate.getTime();
}

/**
 * Return true if `a` and `b` fall on the same calendar day in the
 * viewer's **browser-local** timezone. Two instants on different local
 * days → false, even if they're only minutes apart at midnight.
 *
 *   isSameDayLocal("2026-08-15T18:30:00Z", "2026-08-16T01:00:00Z")
 *   // viewer in IST → true   (both are 2026-08-16 in IST)
 *   // viewer in UTC → false  (different UTC days)
 */
export function isSameDayLocal(
  a: string | Date,
  b: string | Date,
): boolean {
  const aDate = parseInstant(a);
  const bDate = parseInstant(b);
  if (aDate === null || bDate === null) return false;
  // en-CA formats as YYYY-MM-DD using the runtime's local timezone
  // (no timeZone option → browser default). Stable, sortable, and
  // locale-independent enough for grouping.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(aDate) === fmt.format(bDate);
}
