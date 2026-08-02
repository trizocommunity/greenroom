import {
  DEFAULT_TZ,
  wallClockToInstant,
  zonedDayKey,
} from "@/core/datetime";

/**
 * Compose a `Date` (UTC instant) from a user-picked calendar day and
 * time-of-day, anchored to `tz`. Replaces the legacy `new Date(d).setHours(...)`
 * pattern whose semantics depend on the *browser's* local TZ.
 *
 * `date` is a `Date` produced by `react-day-picker` representing the
 * wall-clock day the user clicked (i.e. local-midnight in the browser
 * TZ). We read its calendar-day components in `tz` via `zonedDayKey`,
 * then convert wall-clock → UTC via `wallClockToInstant` so the result
 * is stable across server / client / browser TZ.
 *
 * Used by `DateTimePicker.commit` so the stored value reflects
 * `festival.timezone` (or whatever the caller's authoritative TZ is),
 * not the team-leader's laptop TZ.
 */
export function composePickerValue(
  date: Date,
  hhmm: string,
  tz: string = DEFAULT_TZ,
): Date {
  const yyyymmdd = zonedDayKey(date, tz);
  const iso = wallClockToInstant(yyyymmdd, hhmm, tz);
  return new Date(iso);
}
