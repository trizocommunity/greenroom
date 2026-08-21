/**
 * Centralised date/time module.
 *
 * ─── Quick reference ────────────────────────────────────────────────
 *
 *   // Parse stored values (always returns Date|null)
 *   parseInstant("2026-08-15T09:00:00.000Z")
 *   parseInstant("2026-08-15 09:00:00.000")   // assumed UTC
 *   parseInstant(null)                          // → null
 *
 *   // Display — always browser-local
 *   formatDate(iso)                             // "15 Aug 2026"
 *   formatTime(iso)                             // "09:00"
 *   formatDateTime(iso)                         // "15 Aug 2026 09:00"
 *   formatRelative(iso)                         // "2 hours ago"
 *
 *   // Wall-clock ↔ instant
 *   wallClockToInstant("2026-08-15", "09:00")
 *   instantToWallClockParts(new Date(...))
 *
 *   // Day-key for grouping/comparison
 *   dateKeyLocal(date)                          // "2026-08-15" browser-local
 *   dateKeyUTC(iso)                             // "2026-08-15" UTC
 *
 *   // Comparisons
 *   isExpired(festival.expiresAt)               // bool
 *   msUntil(otp.expiresAt)                      // ms remaining
 *   isSameDayLocal(a, b)                        // browser-local calendar day
 *
 *   // Zod schemas
 *   zodIsoInstant, zodCalendarDate
 *
 * ─── Conventions ─────────────────────────────────────────────────────
 *
 *   • Storage: every persisted timestamp is `timestamptz(3)` storing
 *     UTC, returned as `Z`-suffixed ISO string. Postgres is the clock.
 *   • Display: always browser-local. No `tz` parameter exists.
 */

// Compare
export {
  isAfter,
  isBefore,
  isExpired,
  isSameDayLocal,
  msUntil,
} from "./compare";
// Constants
export { currentTimestampSql, FALLBACK_DISPLAY, MS } from "./constants";
// Drizzle schema helpers
export { tzTimestamp, tzTimestampConfig, tzTimestampNamed } from "./drizzle";
// Format
export {
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
} from "./format";
// Parse
export { parseInstant, parseInstantOrThrow, toDateOrNull } from "./parse";
// Relative-day helpers
export {
  midnightInTz,
  relativeDayKey,
  relativeDayLabel,
} from "./relative-day";
export type { RelativeDay } from "./relative-day";
// Server-side clock helpers
export {
  fromNow,
  nowPlus,
  serverNow,
  serverNowIso,
  serverNowMs,
} from "./server";
// Zod schemas
export { zodCalendarDate, zodDateLike, zodIsoInstant } from "./schemas";
export type { WallClockParts } from "./wall-clock";
// Wall-clock
export {
  dateKeyLocal,
  dateKeyUTC,
  instantToWallClockParts,
  wallClockToInstant,
  zonedDayKey,
} from "./wall-clock";