import type { ProgrammeStatus } from "@/core/types/app-enums";

/**
 * Priority order for showing programme "live status" in participant UI.
 * Lower rank = shown as more "current".
 */
export const PROGRAMME_STATUS_PRIORITY_RANK: Partial<
  Record<ProgrammeStatus, number>
> = {
  // Active / event day first
  REPORTING: 0,
  PENDING_JUDGMENT: 1,
  JUDGING: 2,
  // After event day
  PENDING_PUBLICATION: 3,
  // Judging/results
  PUBLISHED: 4,
  ANNOUNCED: 5,
  // Pre-start
  SCHEDULED: 6,
  ASSIGNED: 7,
  DRAFT: 8,
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
