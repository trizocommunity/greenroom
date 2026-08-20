"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ConflictParts,
  EnrichedScheduleEntry,
} from "@/features/schedule/actions/schedule.actions";
import { checkScheduleConflict } from "@/features/schedule/actions/schedule.actions";
import { localWallClockToDate } from "@/features/schedule/utils/schedule-datetime";

export type ConflictState = {
  error: string | null;
  parts: ConflictParts | null;
};

export type ConflictCheckInput = {
  festivalId: string;
  open: boolean;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  stageId: string;
  entryType: EnrichedScheduleEntry["type"];
  excludeEntryId?: string;
  debounceMs?: number;
};

const EMPTY: ConflictState = { error: null, parts: null };

export function useEntryConflictCheck(
  input: ConflictCheckInput,
): ConflictState {
  const {
    festivalId,
    open,
    dateStr,
    startTimeStr,
    endTimeStr,
    stageId,
    entryType,
    excludeEntryId,
    debounceMs = 400,
  } = input;

  const [state, setState] = useState<ConflictState>(EMPTY);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setState(EMPTY);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const startTime = localWallClockToDate(dateStr, startTimeStr);
      const endTime = endTimeStr
        ? localWallClockToDate(dateStr, endTimeStr)
        : null;
      const res = await checkScheduleConflict(festivalId, {
        startTime,
        endTime,
        stageId: stageId || null,
        scheduleDayKey: dateStr,
        entryType,
        ...(excludeEntryId ? { excludeEntryId } : {}),
      });
      if (res.ok) setState(EMPTY);
      else setState({ error: res.error, parts: res.conflictParts ?? null });
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    festivalId,
    open,
    dateStr,
    startTimeStr,
    endTimeStr,
    stageId,
    entryType,
    excludeEntryId,
    debounceMs,
  ]);

  return state;
}
