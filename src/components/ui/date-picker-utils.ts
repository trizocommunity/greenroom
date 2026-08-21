/**
 * Compose a `Date` (browser-local) from a user-picked calendar day and
 * time-of-day. Mirrors the `Date` constructor used by `react-day-picker`
 * (`new Date(year, monthIndex, day, hour, minute, second)`) so the
 * round-trip from a day-picker click is identity.
 *
 *   composePickerValue(new Date(2026, 7, 20, 0, 0), "09:00")
 *   // → new Date(2026, 7, 20, 9, 0)  (browser-local)
 *
 * The `tz` parameter is **deprecated and ignored**.
 */
export function composePickerValue(
  date: Date,
  hhmm: string,
  /** @deprecated ignored — kept for source compatibility. */
  _tz?: string,
): Date {
  const [hh, mi, ss] = hhmm.split(":");
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(y, m, d, Number(hh), Number(mi), Number(ss ?? "00"));
}

/**
 * Compose a (start, end) `Date` pair from a user-picked calendar range
 * and start/end times, all in browser-local wall-clock time. Either
 * bound may be absent — when `from` or `to` is undefined the
 * corresponding output is `null` (range is half-open).
 *
 * The `tz` parameter is **deprecated and ignored**.
 */
export function composePickerRange(
  from: Date | undefined,
  to: Date | undefined,
  startTime: string,
  endTime: string,
  /** @deprecated ignored — kept for source compatibility. */
  _tz?: string,
): { start: Date | null; end: Date | null } {
  return {
    start: from ? composePickerValue(from, startTime) : null,
    end: to ? composePickerValue(to, endTime) : null,
  };
}
