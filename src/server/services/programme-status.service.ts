import type { ProgrammeStatus } from "@prisma/client";
import type { Tier } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Minimum programme status for a programme to appear in Event-works (Marks, Results, Leaderboard).
 *
 * Kept for backwards compatibility with any older code that might display a "minimum" step.
 * Actual gating uses explicit allowed status sets (so BASIC does NOT allow SCHEDULED).
 */
export function getEventWorksMinimumStatus(tier: Tier): ProgrammeStatus {
  return tier === "BASIC" ? "ASSIGNED" : "SCHEDULED";
}

function getAllowedEventWorksStatuses(tier: Tier): Set<ProgrammeStatus> {
  // Explicit sets prevent BASIC from accidentally including SCHEDULED because of ordering.
  return tier === "BASIC"
    ? new Set<ProgrammeStatus>(["ASSIGNED", "JUDGED", "PUBLISHED"])
    : new Set<ProgrammeStatus>([
        "SCHEDULED",
        "REPORTING",
        "STARTED",
        "ENDED",
        "JUDGED",
        "PUBLISHED",
      ]);
}

/**
 * Returns true if the given programme status is allowed in Event-works for the tier.
 */
export function isProgrammeInEventWorks(
  status: ProgrammeStatus,
  tier: Tier,
): boolean {
  return getAllowedEventWorksStatuses(tier).has(status);
}

/**
 * Filter programmes to those that should appear in Event-works (Marks, Results, Leaderboard) for the given tier.
 */
export function filterProgrammesForEventWorks<T extends { status: ProgrammeStatus }>(
  programmes: T[],
  tier: Tier,
): T[] {
  return programmes.filter((p) => isProgrammeInEventWorks(p.status, tier));
}

/**
 * Recomputes programme status from assignments, schedule entries, and results,
 * then updates the Programme record.
 * Order: READY < ASSIGNED < SCHEDULED < ... < JUDGED < PUBLISHED.
 */
export async function updateProgrammeStatus(
  programmeId: string,
): Promise<ProgrammeStatus> {
  const [programme, assignmentCount, scheduleEntryCount, resultCount, publishedResultCount] =
    await Promise.all([
      prisma.programme.findUnique({
        where: { id: programmeId },
        select: { id: true, status: true },
      }),
      prisma.programmeAssignment.count({ where: { programmeId } }),
      prisma.scheduleEntry.count({
        where: { programmeId, type: "PROGRAMME" },
      }),
      prisma.result.count({ where: { programmeId } }),
      prisma.result.count({
        where: { programmeId, isPublished: true },
      }),
    ]);

  if (!programme) return "READY";

  const hasAssignments = assignmentCount > 0;
  const hasScheduleEntry = scheduleEntryCount > 0;
  const assignmentCountForProgramme = assignmentCount;
  const allAssignmentsHaveResult =
    assignmentCountForProgramme > 0 && resultCount >= assignmentCountForProgramme;
  const allResultsPublished =
    resultCount > 0 && publishedResultCount >= resultCount;

  let status: ProgrammeStatus = "READY";
  if (allResultsPublished) {
    status = "PUBLISHED";
  } else if (allAssignmentsHaveResult) {
    status = "JUDGED";
  } else if (hasScheduleEntry) {
    status = "SCHEDULED";
  } else if (hasAssignments) {
    status = "ASSIGNED";
  }

  await prisma.programme.update({
    where: { id: programmeId },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  return status;
}

/**
 * Set programme to PUBLISHED and set publishedAt (e.g. when bulk publishing results).
 */
export async function setProgrammePublished(
  programmeId: string,
  published: boolean,
): Promise<void> {
  if (!published) {
    await prisma.programme.update({
      where: { id: programmeId },
      data: { status: "JUDGED", publishedAt: null },
    });
    return;
  }
  await prisma.programme.update({
    where: { id: programmeId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

// Backfill intentionally removed: statuses are expected to be correct via update flows.
