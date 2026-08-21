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

export type FoodSlotStatus = "ACTIVE" | "PAST";

export function getFoodSlotStatus(
  now: Date,
  slot: Pick<FoodSlot, "windowStartMin" | "windowEndMin">,
): FoodSlotStatus {
  const localMinutes = nowInBrowserMinutes(now);

  if (localMinutes >= slot.windowStartMin && localMinutes < slot.windowEndMin) {
    return "ACTIVE";
  }
  return "PAST";
}

export function nowInBrowserMinutes(now: Date): number {
  // Browser-local wall-clock minutes from midnight.
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Determines which food session is currently active based on browser-local
 * time and slot windows. Times are interpreted in the browser's local clock.
 */
export function determineActiveSession(
  now: Date,
  slots: FoodSlot[],
  sessionRows: FoodSessionRow[], // these should only be today's sessions
): FoodSessionRow | null {
  const localMinutes = nowInBrowserMinutes(now);

  for (const slot of slots) {
    if (
      localMinutes >= slot.windowStartMin &&
      localMinutes < slot.windowEndMin
    ) {
      const activeSession = sessionRows.find((s) => s.slotId === slot.id);
      if (activeSession && activeSession.status === "OPEN") {
        return activeSession;
      }
    }
  }

  return null;
}
