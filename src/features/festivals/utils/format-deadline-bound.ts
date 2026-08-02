import { formatInTimeZone } from "date-fns-tz";

/**
 * Format a deadline bound for a team-leader chip / gate. Pure helper so
 * the same format lives in one place and can be unit-tested without
 * React rendering. `tz` is mandatory — passing `DEFAULT_TZ` ("UTC") here
 * is the bug behind the team-leader deadine-display issue (see
 * `DeadlinesCard.tsx` and `DeadlineWindowGate.tsx`); the layout must
 * wrap children with `<UserTimezoneProviderClient festivalTimezone={...}>`
 * for this to receive `festival.timezone`.
 *
 * Returns `"—"` for `null` / invalid inputs so a missing bound never
 * crashes a render.
 */
export function formatDeadlineBound(
  value: string | Date | null | undefined,
  tz: string,
  pattern: string = "MMM d, h:mm a",
): string {
  if (value == null) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatInTimeZone(date, tz, pattern);
}
