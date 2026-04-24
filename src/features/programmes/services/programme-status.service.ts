import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  programmeAssignment,
  programmeReportedParticipant,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";

export type ProgrammeStatus =
  | "READY"
  | "RESET"
  | "ASSIGNED"
  | "SCHEDULED"
  | "REPORTING"
  | "STARTED"
  | "ENDED"
  | "JUDGED"
  | "PUBLISHED";
export type Tier = "BASIC" | "STANDARD" | "PRO";

/**
 * Minimum programme status for a programme to appear in Event-works (Marks, Results, Leaderboard).
 */
export function getEventWorksMinimumStatus(tier: Tier): ProgrammeStatus {
  return tier === "BASIC" ? "ASSIGNED" : "SCHEDULED";
}

function getAllowedEventWorksStatuses(tier: Tier): Set<ProgrammeStatus> {
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
export function filterProgrammesForEventWorks<
  T extends { status: ProgrammeStatus },
>(programmes: T[], tier: Tier): T[] {
  return programmes.filter((p) => isProgrammeInEventWorks(p.status, tier));
}

/**
 * Recomputes programme status from assignments, schedule entries, and results,
 * then updates the Programme record.
 * Order: READY < ASSIGNED < SCHEDULED < ... < JUDGED < PUBLISHED.
 */
export async function updateProgrammeStatus(
  programmeId: string,
  reportingSessionId?: string,
): Promise<ProgrammeStatus> {
  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
    with: {
      festival: {
        columns: { tier: true },
      },
    },
  });

  if (!programme) return "READY";

  const latestClosedReportingSession = reportingSessionId
    ? await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(reportingSessionTable.id, reportingSessionId),
          eq(reportingSessionTable.programmeId, programmeId),
          eq(reportingSessionTable.status, "CLOSED"),
        ),
      })
    : await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(reportingSessionTable.programmeId, programmeId),
          eq(reportingSessionTable.status, "CLOSED"),
        ),
        orderBy: [desc(reportingSessionTable.endedAt)],
      });

  if (latestClosedReportingSession) {
    const programmeReportedParticipants =
      await db.query.programmeReportedParticipant.findMany({
        where: eq(
          programmeReportedParticipant.reportingSessionId,
          latestClosedReportingSession.id,
        ),
        columns: { assignmentId: true },
      });

    const reportedAssignmentIds = programmeReportedParticipants.map(
      (r) => r.assignmentId,
    );
    const reportedTotal = reportedAssignmentIds.length;

    let reportedScored = 0;
    let reportedPublished = 0;

    if (reportedTotal > 0) {
      const scoredCount = await db
        .select({ c: count() })
        .from(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, programmeId),
            inArray(resultTable.assignmentId, reportedAssignmentIds),
          ),
        );
      reportedScored = scoredCount[0].c;

      const publishedCount = await db
        .select({ c: count() })
        .from(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, programmeId),
            inArray(resultTable.assignmentId, reportedAssignmentIds),
            eq(resultTable.isPublished, true),
          ),
        );
      reportedPublished = publishedCount[0].c;
    }

    let status: ProgrammeStatus = "STARTED";
    if (reportedTotal > 0 && reportedPublished === reportedTotal) {
      status = "PUBLISHED";
    } else if (reportedTotal > 0 && reportedScored === reportedTotal) {
      status = "ENDED";
    }

    await db
      .update(programmeTable)
      .set({
        status,
        publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(programmeTable.id, programmeId));

    return status;
  }

  const [
    assignmentCount,
    scheduleEntryCount,
    resultCount,
    publishedResultCount,
    groupCountResult,
  ] = await Promise.all([
    db
      .select({ c: count() })
      .from(programmeAssignment)
      .where(eq(programmeAssignment.programmeId, programmeId)),
    db
      .select({ c: count() })
      .from(scheduleEntryTable)
      .where(
        and(
          eq(scheduleEntryTable.programmeId, programmeId),
          eq(scheduleEntryTable.type, "PROGRAMME"),
        ),
      ),
    db
      .select({ c: count() })
      .from(resultTable)
      .where(eq(resultTable.programmeId, programmeId)),
    db
      .select({ c: count() })
      .from(resultTable)
      .where(
        and(
          eq(resultTable.programmeId, programmeId),
          eq(resultTable.isPublished, true),
        ),
      ),
    db
      .select({ c: count() })
      .from(groupTable)
      .where(eq(groupTable.festivalId, programme.festivalId)),
  ]);

  const hasAssignments = assignmentCount[0].c > 0;
  const hasScheduleEntry = scheduleEntryCount[0].c > 0;

  const expectedAssignmentsTotal =
    programme.type === "INDIVIDUAL"
      ? groupCountResult[0].c * (programme.maxParticipantsPerGroup ?? 1)
      : groupCountResult[0].c *
        (programme.maxTeamsPerGroup ?? 1) *
        (programme.maxStudentsPerTeam ?? 1);

  const isFullyAssignedAcrossAllGroups =
    expectedAssignmentsTotal > 0 &&
    assignmentCount[0].c >= expectedAssignmentsTotal;
  const allAssignmentsHaveResult =
    assignmentCount[0].c > 0 && resultCount[0].c >= assignmentCount[0].c;
  const allResultsPublished =
    resultCount[0].c > 0 && publishedResultCount[0].c >= resultCount[0].c;

  const isBasic = (programme.festival.tier ?? "STANDARD") === "BASIC";

  let status: ProgrammeStatus = "READY";
  if (allResultsPublished) {
    status = "PUBLISHED";
  } else if (allAssignmentsHaveResult) {
    status = "JUDGED";
  } else if (!isBasic && hasScheduleEntry) {
    status = "SCHEDULED";
  } else if (isBasic && hasAssignments) {
    status = "ASSIGNED";
  } else if (hasAssignments && isFullyAssignedAcrossAllGroups) {
    status = "ASSIGNED";
  }

  await db
    .update(programmeTable)
    .set({
      status,
      publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programmeTable.id, programmeId));

  return status;
}

export async function setProgrammePublished(
  programmeId: string,
  published: boolean,
): Promise<void> {
  if (!published) {
    const hasClosedReporting =
      await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(reportingSessionTable.programmeId, programmeId),
          eq(reportingSessionTable.status, "CLOSED"),
        ),
        orderBy: [desc(reportingSessionTable.endedAt)],
      });

    await db
      .update(programmeTable)
      .set({
        status: hasClosedReporting ? "ENDED" : "JUDGED",
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(programmeTable.id, programmeId));
    return;
  }
  await db
    .update(programmeTable)
    .set({
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programmeTable.id, programmeId));
}
