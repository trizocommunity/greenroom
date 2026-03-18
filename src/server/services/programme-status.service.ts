import type { ProgrammeStatus } from "@prisma/client";
import type { Tier } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Status order for comparison (higher index = later in lifecycle). */
const STATUS_ORDER: ProgrammeStatus[] = [
  "READY",
  "ASSIGNED",
  "SCHEDULED",
  "REPORTING",
  "STARTED",
  "ENDED",
  "JUDGED",
  "PUBLISHED",
];

function statusOrder(s: ProgrammeStatus): number {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? 0 : i;
}

/**
 * Minimum programme status for a programme to appear in Event-works (Marks, Results, Leaderboard).
 * BASIC: ASSIGNED (no schedule feature). STANDARD/PRO: SCHEDULED.
 */
export function getEventWorksMinimumStatus(tier: Tier): ProgrammeStatus {
  return tier === "BASIC" ? "ASSIGNED" : "SCHEDULED";
}

/**
 * Returns true if the given programme status is at or past the minimum required for Event-works for the tier.
 */
export function isProgrammeInEventWorks(
  status: ProgrammeStatus,
  tier: Tier,
): boolean {
  const min = getEventWorksMinimumStatus(tier);
  return statusOrder(status) >= statusOrder(min);
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

/**
 * Backfill status for all programmes in a festival (e.g. after adding the status column).
 */
export async function backfillProgrammeStatusesForFestival(
  festivalId: string,
): Promise<number> {
  const programmeIds = await prisma.programme.findMany({
    where: { festivalId },
    select: { id: true },
  });
  for (const { id } of programmeIds) {
    await updateProgrammeStatus(id);
  }
  return programmeIds.length;
}
