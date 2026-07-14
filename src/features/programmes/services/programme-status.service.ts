import { and, count, desc, eq, inArray, or } from "drizzle-orm";
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
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";

export type ProgrammeStatus =
  | "READY"
  | "RESET"
  | "ASSIGNED"
  | "SCHEDULED"
  | "REPORTING"
  | "STARTED"
  | "ENDED"
  | "JUDGED"
  | "PUBLISHED"
  | "ANNOUNCED";
export type Tier = "BASIC" | "STANDARD" | "PRO";

/**
 * Minimum programme status for a programme to appear in Event Works (Marks, Results, Leaderboard).
 */
export function getEventWorksMinimumStatus(tier: Tier): ProgrammeStatus {
  return tier === "BASIC" ? "ASSIGNED" : "SCHEDULED";
}

function getAllowedEventWorksStatuses(tier: Tier): Set<ProgrammeStatus> {
  return tier === "BASIC"
    ? new Set<ProgrammeStatus>(["ASSIGNED", "JUDGED", "PUBLISHED", "ANNOUNCED"])
    : new Set<ProgrammeStatus>([
        "SCHEDULED",
        "REPORTING",
        "STARTED",
        "ENDED",
        "JUDGED",
        "PUBLISHED",
        "ANNOUNCED",
      ]);
}

/**
 * Returns true if the given programme status is allowed in Event Works for the tier.
 */
export function isProgrammeInEventWorks(
  status: ProgrammeStatus,
  tier: Tier,
): boolean {
  return getAllowedEventWorksStatuses(tier).has(status);
}

/**
 * Filter programmes to those that should appear in Event Works (Marks, Results, Leaderboard) for the given tier.
 */
type ProgrammeForEventWorksFilter = {
  status: ProgrammeStatus;
  assignments?: readonly unknown[];
};

export function filterProgrammesForEventWorks<
  T extends ProgrammeForEventWorksFilter,
>(programmes: T[], tier: Tier | string | null | undefined): T[] {
  const resolvedTier = getResolvedTier(tier);
  return programmes.filter((p) => {
    if (isProgrammeInEventWorks(p.status, resolvedTier)) return true;
    // BASIC: programmes with any assignment belong in Marks / Event Works even if
    // status is still READY (e.g. legacy rows or status not recomputed yet).
    if (
      resolvedTier === "BASIC" &&
      Array.isArray(p.assignments) &&
      p.assignments.length > 0
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Recomputes programme status for BASIC festivals where assignments exist but status
 * was never promoted to ASSIGNED (common after tier fixes or legacy data).
 */
export async function syncStaleBasicProgrammeStatuses(
  programmes: {
    id: string;
    status: ProgrammeStatus;
    assignments?: readonly unknown[];
  }[],
  tier: Tier | string | null | undefined,
): Promise<void> {
  if (!isBasicTier(tier)) return;

  const resolvedTier = getResolvedTier(tier);
  const stale = programmes.filter(
    (p) =>
      Array.isArray(p.assignments) &&
      p.assignments.length > 0 &&
      !isProgrammeInEventWorks(p.status, resolvedTier),
  );

  await Promise.all(
    stale.map(async (p) => {
      const status = await updateProgrammeStatus(p.id);
      (p as { status: ProgrammeStatus }).status = status;
    }),
  );
}

type PreWorksStatusInput = {
  hasAssignments: boolean;
  hasScheduleEntry: boolean;
  isFullyAssignedAcrossAllGroups: boolean;
  isBasic: boolean;
};

/** READY → ASSIGNED → SCHEDULED from Pre Event Works only. */
function computePreWorksStatus(input: PreWorksStatusInput): ProgrammeStatus {
  if (!input.isBasic && input.hasScheduleEntry) return "SCHEDULED";
  if (input.isBasic && input.hasAssignments) return "ASSIGNED";
  if (input.hasAssignments && input.isFullyAssignedAcrossAllGroups) {
    return "ASSIGNED";
  }
  return "READY";
}

/**
 * Recomputes programme status, then updates the Programme record.
 *
 * - Standard/Pro: pre-works (READY/ASSIGNED/SCHEDULED) and live reporting
 *   (REPORTING/STARTED/ENDED); PUBLISHED/ANNOUNCED only after a closed reporting session.
 * - Basic: marks flow can reach JUDGED/PUBLISHED/ANNOUNCED from results directly.
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
    let reportedAnnounced = 0;

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

      const announcedCount = await db
        .select({ c: count() })
        .from(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, programmeId),
            inArray(resultTable.assignmentId, reportedAssignmentIds),
            eq(resultTable.isAnnounced, true),
          ),
        );
      reportedAnnounced = announcedCount[0].c;
    }

    let status: ProgrammeStatus = "STARTED";
    if (reportedTotal > 0 && reportedAnnounced === reportedTotal) {
      status = "ANNOUNCED";
    } else if (reportedTotal > 0 && reportedPublished === reportedTotal) {
      status = "PUBLISHED";
    } else if (reportedTotal > 0 && reportedScored === reportedTotal) {
      status = "ENDED";
    }

    await db
      .update(programmeTable)
      .set({
        status,
        publishedAt:
          status === "PUBLISHED" || status === "ANNOUNCED"
            ? new Date().toISOString()
            : null,
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
    announcedResultCount,
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
      .from(resultTable)
      .where(
        and(
          eq(resultTable.programmeId, programmeId),
          eq(resultTable.isAnnounced, true),
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
  const allResultsAnnounced =
    resultCount[0].c > 0 && announcedResultCount[0].c >= resultCount[0].c;

  const isBasic = isBasicTier(programme.festival.tier);

  let status: ProgrammeStatus;

  if (isBasic) {
    if (allResultsAnnounced) {
      status = "ANNOUNCED";
    } else if (allResultsPublished) {
      status = "PUBLISHED";
    } else if (allAssignmentsHaveResult) {
      status = "JUDGED";
    } else {
      status = computePreWorksStatus({
        hasAssignments,
        hasScheduleEntry,
        isFullyAssignedAcrossAllGroups,
        isBasic,
      });
    }
  } else {
    const activeReportingSession =
      await db.query.programmeReportingSession.findFirst({
        where: and(
          eq(reportingSessionTable.programmeId, programmeId),
          or(
            eq(reportingSessionTable.status, "IN_PROGRESS"),
            eq(reportingSessionTable.status, "RESET"),
          ),
        ),
        orderBy: [desc(reportingSessionTable.updatedAt)],
        columns: { status: true },
      });

    if (activeReportingSession?.status === "IN_PROGRESS") {
      status = "REPORTING";
    } else if (
      activeReportingSession?.status === "RESET" &&
      programme.status === "RESET"
    ) {
      status = "RESET";
    } else {
      status = computePreWorksStatus({
        hasAssignments,
        hasScheduleEntry,
        isFullyAssignedAcrossAllGroups,
        isBasic,
      });
    }
  }

  await db
    .update(programmeTable)
    .set({
      status,
      publishedAt:
        status === "PUBLISHED" || status === "ANNOUNCED"
          ? new Date().toISOString()
          : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programmeTable.id, programmeId));

  return status;
}

export async function setProgrammeAnnounced(
  programmeId: string,
  announced: boolean,
): Promise<void> {
  if (!announced) {
    await db
      .update(programmeTable)
      .set({
        status: "PUBLISHED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(programmeTable.id, programmeId));
    return;
  }
  await db
    .update(programmeTable)
    .set({
      status: "ANNOUNCED",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programmeTable.id, programmeId));
}

export async function setProgrammePublished(
  programmeId: string,
  published: boolean,
): Promise<void> {
  if (!published) {
    await updateProgrammeStatus(programmeId);
    await db
      .update(programmeTable)
      .set({ publishedAt: null })
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
