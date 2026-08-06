import { formatInTimeZone } from "date-fns-tz";

export interface FoodSlot {
  id: string;
  windowStartMin: number;
  windowEndMin: number;
}

export interface FoodSessionRow {
  id: string;
  slotId: string;
  sessionDate: string;
  status: "OPEN" | "CLOSED";
}

/**
 * Helper to get the minutes since midnight in a specific timezone.
 */
export function nowInFestivalTZMinutes(now: Date, timeZone: string): number {
  // Format the time as HH:mm in the given timezone
  const timeString = formatInTimeZone(now, timeZone, "HH:mm");
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Determines which food session is currently active based on festival timezone and slot windows.
 */
export function determineActiveSession(
  now: Date,
  festivalTimeZone: string | undefined,
  slots: FoodSlot[],
  sessionRows: FoodSessionRow[] // these should only be today's sessions
): FoodSessionRow | null {
  const tz = festivalTimeZone || "UTC"; // fallback
  const localMinutes = nowInFestivalTZMinutes(now, tz);

  for (const slot of slots) {
    if (localMinutes >= slot.windowStartMin && localMinutes < slot.windowEndMin) {
      const activeSession = sessionRows.find((s) => s.slotId === slot.id);
      if (activeSession && activeSession.status === "OPEN") {
        return activeSession;
      }
    }
  }

  return null;
}
