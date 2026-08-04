import { parseInstant } from "@/core/datetime";

/**
 * A team-leader action window (participant registration, programme
 * assignment). Both bounds are optional:
 *
 *   • no start → open from the beginning
 *   • no end   → never closes
 *
 * Absence therefore always means "no restriction", so festivals created
 * before windows existed keep working.
 */
export type DeadlineWindowInput = {
  start?: string | Date | null;
  end?: string | Date | null;
};

export type DeadlineWindowState = "UPCOMING" | "OPEN" | "CLOSED";

export type DeadlineWindow = {
  state: DeadlineWindowState;
  isLocked: boolean;
  start: Date | null;
  end: Date | null;
};

export function resolveDeadlineWindow(
  { start, end }: DeadlineWindowInput,
  now: Date = new Date(),
): DeadlineWindow {
  const startDate = parseInstant(start ?? null);
  const endDate = parseInstant(end ?? null);
  const state = computeState(startDate, endDate, now);

  return { state, isLocked: state !== "OPEN", start: startDate, end: endDate };
}

export function computeState(
  start: Date | null,
  end: Date | null,
  now: Date = new Date(),
): DeadlineWindowState {
  if (end && now.getTime() >= end.getTime()) return "CLOSED";
  if (start && now.getTime() < start.getTime()) return "UPCOMING";
  return "OPEN";
}

/** True when team leaders may act right now. */
export function isDeadlineWindowOpen(
  window: DeadlineWindowInput,
  now: Date = new Date(),
): boolean {
  return resolveDeadlineWindow(window, now).state === "OPEN";
}

/**
 * The next moment the window changes state, or `null` when it never
 * will again (already closed, or unbounded). Used to schedule the
 * client-side timer that flips the UI without a refresh.
 */
export function nextDeadlineWindowTransition(
  start: Date | null,
  end: Date | null,
  now: Date = new Date(),
): Date | null {
  const state = computeState(start, end, now);
  if (state === "UPCOMING") return start;
  if (state === "OPEN") return end;
  return null;
}
