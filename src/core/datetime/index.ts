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
 *   // Display (always in passed tz)
 *   formatDate(iso, { tz: "Asia/Kolkata" })
 *   formatTime(iso, { tz: "Asia/Kolkata" })
 *   formatDateTime(iso, { tz: "Asia/Kolkata" })
 *   formatRelative(iso)                         // "2 hours ago"
 *
 *   // Wall-clock ↔ UTC instant
 *   wallClockToInstant("2026-08-15", "09:00", "Asia/Kolkata")
 *   instantToWallClockParts("2026-08-15T03:30:00.000Z", "Asia/Kolkata")
 *
 *   // Day-key for grouping/comparison (timezone-aware)
 *   dateKeyLocal(iso, "Asia/Kolkata")           // "2026-08-16"
 *   dateKeyUTC(iso)                             // "2026-08-15"
 *
 *   // Comparisons
 *   isExpired(festival.expiresAt)               // bool
 *   msUntil(otp.expiresAt)                      // ms remaining
 *   isSameDayLocal(aIso, bIso, festival.timezone)
 *
 *   // Browser / server detection
 *   getBrowserTimezone()                        // client-side, IANA name
 *   isValidTimezone("Asia/Kolkata")             // bool
 *   supportedTimezones()                        // ~600 entries on Node 18+
 *
 *   // Zod schemas
 *   zodIsoInstant, zodCalendarDate, zodTimezone, zodTimezoneLoose
 *
 *   // Curated dropdown data
 *   TZ_OPTIONS, groupedTimezones(), labelForTimezone(name)
 *
 * ─── Conventions ─────────────────────────────────────────────────────
 *
 *   • Storage: every persisted timestamp is `timestamptz(3)` storing
 *     UTC, returned as `Z`-suffixed ISO string. Postgres is the clock.
 *   • Display: always call format helpers with `tz`; default is UTC.
 *   • Browser vs server: `getBrowserTimezone()` works in both. For
 *     personalised rendering, fetch `user.timezone` (see `server.ts`).
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
export {
  currentTimestampSql,
  DEFAULT_TZ,
  FALLBACK_DISPLAY,
  MS,
} from "./constants";
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
// Zod schemas
export {
  zodCalendarDate,
  zodDateLike,
  zodIsoInstant,
  zodTimezone,
  zodTimezoneLoose,
} from "./schemas";
export type { TimezoneOption } from "./tz-list";
// TZ dropdown data
export {
  groupedTimezones,
  labelForTimezone,
  TZ_OPTIONS,
} from "./tz-list";
// User TZ (universal — works on both client and server)
export {
  getBrowserTimezone,
  isValidTimezone,
  supportedTimezones,
} from "./user-tz";
export type { WallClockParts } from "./wall-clock";
// Wall-clock
export {
  dateKeyLocal,
  dateKeyUTC,
  instantToWallClockParts,
  wallClockToInstant,
  zonedDayKey,
} from "./wall-clock";

// NOTE: `server.ts` is NOT re-exported here. It must be imported
// directly with `server-only` semantics already enforced.
// Use:
//   import { serverNow, fromNow, resolveDisplayTimezone } from "@/core/datetime/server";
