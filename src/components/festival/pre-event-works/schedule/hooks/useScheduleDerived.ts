"use client";

import { useEffect, useMemo, useState } from "react";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import { getDateKey } from "../constants";

export type GroupedByDay = Record<string, EnrichedScheduleEntry[]>;

export type ScheduleDerived = {
  groupedByDay: GroupedByDay;
  sortedDays: string[];
  conflictCount: number;
};

export function computeConflictCount(entries: EnrichedScheduleEntry[]): number {
  let count = 0;
  const checked = new Set<string>();
  for (const entry of entries) {
    if (!entry.stageId || !entry.endTime) continue;
    const startA = new Date(entry.startTime).getTime();
    const endA = new Date(entry.endTime).getTime();
    for (const other of entries) {
      if (other.id === entry.id || other.stageId !== entry.stageId) continue;
      if (!other.endTime) continue;
      const pairKey = [entry.id, other.id].sort().join(":");
      if (checked.has(pairKey)) continue;
      const startB = new Date(other.startTime).getTime();
      const endB = new Date(other.endTime).getTime();
      if (startA < endB && startB < endA) {
        count++;
        checked.add(pairKey);
      }
    }
  }
  return count;
}

export function groupEntriesByDay(
  entries: EnrichedScheduleEntry[],
): GroupedByDay {
  return entries.reduce<GroupedByDay>((acc, entry) => {
    const key = getDateKey(parseStoredScheduleInstant(entry.startTime));
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});
}

export function useScheduleDerived(entries: EnrichedScheduleEntry[]) {
  const groupedByDay = useMemo(() => groupEntriesByDay(entries), [entries]);
  const sortedDays = useMemo(
    () => Object.keys(groupedByDay).sort(),
    [groupedByDay],
  );
  const conflictCount = useMemo(() => computeConflictCount(entries), [entries]);
  return { groupedByDay, sortedDays, conflictCount };
}

export function useActiveDay(
  sortedDays: string[],
  initialDayKey: string | null,
): {
  activeDayKey: string | null;
  effectiveActiveDay: string | null;
  setActiveDayKey: (k: string | null) => void;
} {
  const [activeDayKey, setActiveDayKey] = useState<string | null>(
    initialDayKey,
  );
  const effectiveActiveDay =
    activeDayKey && sortedDays.includes(activeDayKey)
      ? activeDayKey
      : (sortedDays[0] ?? null);

  useEffect(() => {
    if (initialDayKey && !activeDayKey) setActiveDayKey(initialDayKey);
  }, [initialDayKey, activeDayKey]);

  return { activeDayKey, effectiveActiveDay, setActiveDayKey };
}
