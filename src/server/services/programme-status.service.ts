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
  const programme = await prisma.programme.findUnique({
    where: { id: programmeId },
    select: {
      id: true,
      status: true,
      festivalId: true,
      type: true,
      maxParticipantsPerGroup: true,
      maxTeamsPerGroup: true,
      maxStudentsPerTeam: true,
    },
  });

  if (!programme) return "READY";

  // If reporting has been submitted and the session is CLOSED, programme
  // status should be driven by judging progress (results on reported participants),
  // not by schedule/assignment presence. This prevents downgrades back to SCHEDULED.
  const latestClosedReportingSession = await prisma.programmeReportingSession.findFirst({
    where: { programmeId, status: "CLOSED" },
    select: { id: true, endedAt: true },
    orderBy: { endedAt: "desc" },
  });

  if (latestClosedReportingSession) {
    const reportedParticipants = await prisma.programmeReportedParticipant.findMany({
      where: { reportingSessionId: latestClosedReportingSession.id },
      select: { assignmentId: true },
    });

    const reportedAssignmentIds = reportedParticipants.map((r) => r.assignmentId);
    const reportedTotal = reportedAssignmentIds.length;

    const reportedScored = await prisma.result.count({
      where: {
        programmeId,
        assignmentId: { in: reportedAssignmentIds },
      },
    });

    const reportedPublished = await prisma.result.count({
      where: {
        programmeId,
        assignmentId: { in: reportedAssignmentIds },
        isPublished: true,
      },
    });

    let status: ProgrammeStatus = "STARTED";
    if (reportedTotal > 0 && reportedPublished === reportedTotal) {
      status = "PUBLISHED";
    } else if (reportedTotal > 0 && reportedScored === reportedTotal) {
      status = "ENDED";
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

  const [
    assignmentCount,
    scheduleEntryCount,
    resultCount,
    publishedResultCount,
    groupCount,
  ] = await Promise.all([
    prisma.programmeAssignment.count({ where: { programmeId } }),
    prisma.scheduleEntry.count({
      where: { programmeId, type: "PROGRAMME" },
    }),
    prisma.result.count({ where: { programmeId } }),
    prisma.result.count({
      where: { programmeId, isPublished: true },
    }),
    prisma.group.count({
      where: { festivalId: programme.festivalId },
    }),
  ]);

  const hasAssignments = assignmentCount > 0;
  const hasScheduleEntry = scheduleEntryCount > 0;
  const assignmentCountForProgramme = assignmentCount;

  const expectedAssignmentsTotal =
    programme.type === "INDIVIDUAL"
      ? groupCount * (programme.maxParticipantsPerGroup ?? 1)
      : groupCount *
        (programme.maxTeamsPerGroup ?? 1) *
        (programme.maxStudentsPerTeam ?? 1);

  const isFullyAssignedAcrossAllGroups =
    expectedAssignmentsTotal > 0 && assignmentCount >= expectedAssignmentsTotal;
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
  } else if (hasAssignments && isFullyAssignedAcrossAllGroups) {
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
    const hasClosedReporting = await prisma.programmeReportingSession.findFirst({
      where: { programmeId, status: "CLOSED" },
      select: { id: true },
      orderBy: { endedAt: "desc" },
    });
    await prisma.programme.update({
      where: { id: programmeId },
      data: {
        status: hasClosedReporting ? "ENDED" : "JUDGED",
        publishedAt: null,
      },
    });
    return;
  }
  await prisma.programme.update({
    where: { id: programmeId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

// Backfill intentionally removed: statuses are expected to be correct via update flows.
