import type { ProgrammeStatus } from "@/lib/app-enums";

/**
 * Priority order for showing programme "live status" in student UI.
 * Lower rank = shown as more "current".
 */
export const PROGRAMME_STATUS_PRIORITY_RANK: Partial<
  Record<ProgrammeStatus, number>
> = {
  // Active / event day first
  REPORTING: 0,
  STARTED: 1,
  // After event day
  ENDED: 2,
  // Judging/results
  JUDGED: 3,
  PUBLISHED: 4,
  // Pre-start
  SCHEDULED: 5,
  ASSIGNED: 6,
  READY: 7,
};

export function getProgrammeStatusPriorityRank(
  status: ProgrammeStatus,
): number {
  return PROGRAMME_STATUS_PRIORITY_RANK[status] ?? 999;
}

export function getTopPriorityProgrammeStatus(
  statuses: ProgrammeStatus[],
): ProgrammeStatus | null {
  if (!statuses.length) return null;
  return (
    statuses
      .filter(Boolean)
      .sort(
        (a, b) =>
          getProgrammeStatusPriorityRank(a) - getProgrammeStatusPriorityRank(b),
      )[0] ?? null
  );
}
