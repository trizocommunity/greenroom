import { z } from "zod";

import { TZ_OPTIONS } from "./tz-list";

/**
 * Zod schema for a stored UTC instant string. Accepts both `Z` and
 * explicit `±HH:MM` offsets, as well as Postgres-style timestamps
 * without TZ (treated as UTC).
 */
export const zodIsoInstant = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "Invalid ISO instant",
  });

/**
 * Zod schema for a Date input that accepts either a string (parseable)
 * or a `Date` instance.
 */
export const zodDateLike = z.union([z.date(), zodIsoInstant]);

/**
 * Zod schema for a `YYYY-MM-DD` calendar-date string. Used by date-only
 * fields like DOB.
 */
export const zodCalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Expected YYYY-MM-DD",
});

/**
 * Zod schema for an IANA timezone name. Accepts any string in the
 * curated TZ_OPTIONS list. Validates only *known* zones — this is a
 * closed system (drop-down driven), so unknown values are user errors.
 */
export const zodTimezone = z.enum(
  TZ_OPTIONS.map((opt) => opt.value) as [string, ...string[]],
);

/**
 * Loose timezone validator: accepts any string but warns on unknown
 * names. Use when the source is freeform (e.g. browser auto-detect).
 */
export const zodTimezoneLoose = z.string().min(1).max(64);
