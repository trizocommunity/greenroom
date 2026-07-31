import { MS } from "./constants";
import { isValidTimezone } from "./user-tz";

/**
 * Server-side "now" — returns a fresh `Date` from the Node clock.
 *
 * We deliberately use the Node clock for *app-driven* timestamps
 * (session expiry, OTP expiry, rate-limit windows) because those need
 * millisecond-accurate computation. For *DB-row* timestamps we still
 * prefer Postgres `CURRENT_TIMESTAMP` (see `constants.ts`) to avoid
 * drift between two clocks.
 */
export function serverNow(): Date {
  return new Date();
}

export function serverNowMs(): number {
  return Date.now();
}

export function serverNowIso(): string {
  return new Date().toISOString();
}

/**
 * Return the ISO string for `now + offsetMs`. Centralised so callers
 * never write `new Date(Date.now() + 60_000).toISOString()` by hand
 * (which is easy to typo).
 *
 *   fromNow(60 * 60 * 1000)  // "now + 1 hour", ISO format
 *   fromNow(-MS.day)         // "24 hours ago", ISO format
 */
export function fromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

/**
 * Return a `Date` for `now + offsetMs`. Use when the caller needs a
 * `Date` instance (e.g. to set a cookie `expires` or compute a follow-up
 * duration arithmetic). For DB writes prefer `fromNow(...).toISOString()`.
 */
export function nowPlus(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

export { MS };

/**
 * Resolve which timezone to use when rendering a date in the current
 * request context. Resolution order:
 *   1. Explicit `tz` argument (highest priority)
 *   2. Festival's `timezone` column if `festivalId` is provided
 *   3. User's `timezone` column if `userId` is provided
 *   4. `"UTC"` as last-resort
 *
 * The optional `lookup` callback is used to read festival/user rows
 * without binding this module to a specific ORM. Most callers will
 * pass a small `(ids) => Promise<{ festivalTz?, userTz? }>` adapter.
 */
export async function resolveDisplayTimezone(
  ctx: {
    tz?: string;
    festivalId?: string;
    userId?: string;
  },
  lookup?: (ctx: { festivalId?: string; userId?: string }) => Promise<{
    festivalTz?: string | null;
    userTz?: string | null;
  }>,
): Promise<string> {
  if (ctx.tz && isValidTimezone(ctx.tz)) return ctx.tz;
  if (lookup) {
    const { festivalTz, userTz } = await lookup(ctx);
    if (festivalTz && isValidTimezone(festivalTz)) return festivalTz;
    if (userTz && isValidTimezone(userTz)) return userTz;
  }
  return "UTC";
}

/**
 * Server-side helper: read the current user's timezone from the session.
 * Returns `null` when not authenticated or when the column is unset.
 * Used by server actions / API routes to render datetimes in the user's
 * preferred timezone. See Phase 7 wiring.
 */
export type SessionUserTimezoneReader = () => Promise<string | null>;

export function noopUserTimezoneReader(): Promise<string | null> {
  return Promise.resolve(null);
}
