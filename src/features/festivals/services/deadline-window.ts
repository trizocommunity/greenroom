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

export type DeadlineWindowState =
  | "UNCONFIGURED"
  | "UPCOMING"
  | "OPEN"
  | "CLOSED";

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
  if (!start && !end) return "UNCONFIGURED";
  if (end && now.getTime() >= end.getTime()) return "CLOSED";
  if (start && now.getTime() < start.getTime()) return "UPCOMING";
  return "OPEN";
}

/**
 * True when the deadline window is currently open.
 *
 * Kept the legacy "absence = no restriction" semantics for non-team-leader
 * callers (the admin tier-gated capabilities, the public dashboard chip).
 * When you want the stricter "must have an explicitly configured window"
 * semantics, use `isTeamLeaderActionWindowOpen` instead.
 */
export function isDeadlineWindowOpen(
  window: DeadlineWindowInput,
  now: Date = new Date(),
): boolean {
  const startDate = parseInstant(window.start ?? null);
  const endDate = parseInstant(window.end ?? null);
  // Either bound missing → no restriction (legacy behaviour).
  if (!startDate || !endDate) return true;
  return resolveDeadlineWindow(window, now).state === "OPEN";
}

/**
 * True when a team leader may act *right now*. Stricter than
 * `isDeadlineWindowOpen`: requires BOTH bounds to be set. A festival
 * without a configured deadline (or with only one of the two dates
 * filled in) locks team-leader actions until the festival manager
 * sets a complete open → close window. Use this on team-leader
 * surfaces; keep `isDeadlineWindowOpen` for other callers that want
 * the legacy "absence = no restriction" behaviour.
 */
export function isTeamLeaderActionWindowOpen(
  window: DeadlineWindowInput,
  now: Date = new Date(),
): boolean {
  const startDate = parseInstant(window.start ?? null);
  const endDate = parseInstant(window.end ?? null);
  if (!startDate || !endDate) return false;
  return computeState(startDate, endDate, now) === "OPEN";
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
