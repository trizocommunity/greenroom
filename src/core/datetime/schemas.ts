import { z } from "zod";

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
