import { dateKeyLocal } from "@/core/datetime";

/**
 * Calendar day keys (yyyy-MM-dd, in browser-local time) for every day
 * that has at least one schedule entry. Duplicates are collapsed and
 * the result is sorted ascending so consumers can build lookups and
 * sorted lists without re-sorting.
 *
 * Entries whose key is missing or unparseable are ignored (no throw) —
 * guards against partial fixtures and lets the UI show an empty day
 * list instead of a hard error.
 *
 * Prefers the entry's explicit `scheduleDayKey` field when it matches a
 * real calendar day; falls back to deriving the key from `startTime`.
 *
 * The `tz` parameter is **deprecated and ignored**.
 */
export function getScheduledDayKeys(
  entries: ReadonlyArray<{
    startTime?: string | Date | null;
    scheduleDayKey?: string | null;
  }>,
  /** @deprecated ignored — kept for source compatibility. */
  _tz?: string,
): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    const explicit = entry.scheduleDayKey?.trim();
    if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
      keys.add(explicit);
      continue;
    }
    const key = dateKeyLocal(entry.startTime ?? "");
    if (key) keys.add(key);
  }
  return Array.from(keys).sort();
}

/**
 * O(1) lookup of "does this day key have any schedule entries?".
 * Build via `getScheduledDayKeys` then memoise at the call site.
 */
export function hasScheduleEntry(
  scheduledDayKeys: ReadonlyArray<string>,
  dayKey: string,
): boolean {
  return scheduledDayKeys.includes(dayKey);
}
