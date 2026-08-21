import { MS } from "./constants";

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
