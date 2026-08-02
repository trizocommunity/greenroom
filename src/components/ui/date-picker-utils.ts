import { DEFAULT_TZ, wallClockToInstant, zonedDayKey } from "@/core/datetime";

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

/**
 * Compose a (start, end) `Date` pair from a user-picked calendar range
 * and start/end times, anchored to `tz`. Either bound may be absent —
 * when `from` or `to` is undefined the corresponding output is `null`
 * (range is half-open). Used by `DateRangePicker` so the two halves of
 * a deadline window stay in lockstep on a single TZ instead of bouncing
 * off each other's `from`/`to` bounds (the source of the
 * "picks 6, lands on 4" UX conflict on the old per-bound pickers).
 */
export function composePickerRange(
  from: Date | undefined,
  to: Date | undefined,
  startTime: string,
  endTime: string,
  tz: string = DEFAULT_TZ,
): { start: Date | null; end: Date | null } {
  return {
    start: from ? composePickerValue(from, startTime, tz) : null,
    end: to ? composePickerValue(to, endTime, tz) : null,
  };
}
