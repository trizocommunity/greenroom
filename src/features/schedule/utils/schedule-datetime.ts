/**
 * Build a Date from the organizer's date + time inputs (browser local wall clock).
 * Avoids `new Date("YYYY-MM-DDTHH:mm")` which is parsed as UTC in some runtimes
 * and shifts the instant (e.g. 9:00 → wrong UTC / wrong display).
 */
export function localWallClockToDate(
  dateYYYYMMDD: string,
  timeHHmm: string,
): Date {
  const ymd = dateYYYYMMDD.split("-").map((x) => parseInt(x, 10));
  const y = ymd[0]!;
  const mo = ymd[1]!;
  const d = ymd[2]!;
  const parts = timeHHmm.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const mi = parseInt(parts[1] ?? "0", 10);
  const sec = parts[2] != null ? parseInt(parts[2], 10) : 0;
  if ([y, mo, d, h, mi, sec].some((n) => Number.isNaN(n) || n === undefined)) {
    return new Date(NaN);
  }
  return new Date(y, mo - 1, d, h, mi, sec, 0);
}

/**
 * Parse schedule_entry timestamps from the DB. Rows are written with
 * `toISOString()` (UTC). Some drivers return ISO without `Z`; `new Date(that)`
 * is then interpreted as *local* wall time and shifts displayed times.
 */
export function parseStoredScheduleInstant(
  value: string | Date | null | undefined,
): Date {
  if (value == null || value === "") return new Date(NaN);
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (/Z$/i.test(s)) return new Date(s);
  if (/[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  return new Date(`${normalized}Z`);
}
