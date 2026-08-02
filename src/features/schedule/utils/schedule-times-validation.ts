import { DEFAULT_TZ } from "@/core/datetime/constants";
import {
  getScheduleDateKeyUpperBound,
  isSameCalendarDay,
  isValidScheduleDayKey,
} from "@/features/schedule/utils/festival-schedule-days";

export function validateScheduleTimesForFestival(
  festival: { startDate: string | null; endDate: string | null },
  startTime: Date,
  endTime: Date | null,
  scheduleDayKey: string | null | undefined,
  tz: string = DEFAULT_TZ,
): { ok: true } | { ok: false; error: string } {
  if (!festival.startDate || !festival.endDate) {
    return {
      ok: false,
      error:
        "Set your festival event start and end dates in festival settings before scheduling.",
    };
  }

  const endKey = getScheduleDateKeyUpperBound(festival.endDate, tz);
  if (!endKey) {
    return {
      ok: false,
      error:
        "Festival event dates are invalid. Update them in festival settings.",
    };
  }

  const key = scheduleDayKey?.trim() ?? "";
  if (!isValidScheduleDayKey(key)) {
    return { ok: false, error: "Choose a valid schedule date." };
  }
  if (key > endKey) {
    return {
      ok: false,
      error: "That date is after your festival event end date.",
    };
  }

  if (Number.isNaN(startTime.getTime())) {
    return { ok: false, error: "Invalid start time." };
  }

  if (endTime != null) {
    if (Number.isNaN(endTime.getTime())) {
      return { ok: false, error: "Invalid end time." };
    }
    if (endTime <= startTime) {
      return { ok: false, error: "End time must be after start time." };
    }
    if (!isSameCalendarDay(startTime, endTime, tz)) {
      return {
        ok: false,
        error: "Start and end must be on the same calendar day.",
      };
    }
  }

  return { ok: true };
}
