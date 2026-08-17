import { parseInstant } from "@/core/datetime";

/**
 * Whole-minute counter for an elapsed interval. We only show minutes on the
 * card — seconds would flicker too quickly on a glanceable badge — but every
 * caller that needs precision (the drawer's full duration) gets a richer
 * helper below.
 */
export function formatElapsedMinutes(fromMs: number, toMs: number): string {
  const diffMs = Math.max(0, toMs - fromMs);
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/** Minute + second formatter for the full-duration pill in the drawer. */
export function formatElapsedClock(fromMs: number, toMs: number): string {
  const diffMs = Math.max(0, toMs - fromMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function toEpochMs(value: string | Date | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  return parseInstant(value)?.getTime() ?? 0;
}
