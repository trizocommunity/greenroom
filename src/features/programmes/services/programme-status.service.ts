import { and, count, desc, eq, inArray, max, or } from "drizzle-orm";
import { db } from "@/core/database/client";
import { AppError } from "@/core/errors/errors";
import {
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  group as groupTable,
  programmeAssignment,
  programmeReportedParticipant,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";

export type ProgrammeStatus =
  | "DRAFT"
  | "CANCELLED"
  | "ASSIGNED"
  | "SCHEDULED"
  | "REPORTING"
  | "PENDING_JUDGMENT"
  | "JUDGING"
  | "PENDING_PUBLICATION"
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
    ? new Set<ProgrammeStatus>(["ASSIGNED", "PENDING_PUBLICATION", "PUBLISHED", "ANNOUNCED"])
    : new Set<ProgrammeStatus>([
        "SCHEDULED",
        "REPORTING",
        "PENDING_JUDGMENT",
        "JUDGING",
        "PENDING_PUBLICATION",
        "PUBLISHED",
        "ANNOUNCED"
      ]);
}

/**
 * Returns true if the given programme status is allowed in Event Works for the tier.
 */
export function isProgrammeInEventWorks(
  status: string,
  tier: Tier,
): boolean {
  return getAllowedEventWorksStatuses(tier).has(status as ProgrammeStatus);
}

/**
 * Filter programmes to those that should appear in Event Works (Marks, Results, Leaderboard) for the given tier.
 */
export type ProgrammeForEventWorksFilter = {
  status: string;
  id: string;
  assignments?: readonly unknown[];
};

export function filterProgrammesForEventWorks<
  T extends ProgrammeForEventWorksFilter,
>(programmes: T[], tier: Tier | string | null | undefined): T[] {
  const resolvedTier = getResolvedTier(tier);
  return programmes.filter((p) => {
    if (isProgrammeInEventWorks(p.status, resolvedTier)) return true;
    // BASIC: programmes with any assignment belong in Marks / Event Works even if
    // status is still DRAFT (e.g. legacy rows or status not recomputed yet).
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
  return "DRAFT";
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

  if (!programme) return "DRAFT";

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
        columns: { assignmentId: true, participantId: true },
      });

    // Participants marked "absent" (their code letter isAbsent) are never
    // scored and never get a result row — they must be excluded from the
    // "expected results" total, otherwise the programme can never reach
    // ENDED/PUBLISHED/ANNOUNCED once anyone is marked absent.
    const absentRecipients = await db
      .select({ participantId: codeLetterRecipientTable.participantId })
      .from(codeLetterRecipientTable)
      .innerJoin(
        codeLetterTable,
        eq(codeLetterRecipientTable.codeLetterId, codeLetterTable.id),
      )
      .where(
        and(
          eq(
            codeLetterTable.reportingSessionId,
            latestClosedReportingSession.id,
          ),
          eq(codeLetterTable.isAbsent, true),
        ),
      );
    const absentParticipantIds = new Set(
      absentRecipients.map((r) => r.participantId),
    );

    const expectedAssignmentIds = programmeReportedParticipants
      .filter(
        (r) => !(r.participantId && absentParticipantIds.has(r.participantId)),
      )
      .map((r) => r.assignmentId);
    const reportedTotal = expectedAssignmentIds.length;

    let reportedScored = 0;
    let reportedPublished = 0;

    if (reportedTotal > 0) {
      const scoredCount = await db
        .select({ c: count() })
        .from(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, programmeId),
            inArray(resultTable.assignmentId, expectedAssignmentIds),
          ),
        );
      reportedScored = scoredCount[0].c;

      const publishedCount = await db
        .select({ c: count() })
        .from(resultTable)
        .where(
          and(
            eq(resultTable.programmeId, programmeId),
            inArray(resultTable.assignmentId, expectedAssignmentIds),
            eq(resultTable.isPublished, true),
          ),
        );
      reportedPublished = publishedCount[0].c;
    }

    let status: ProgrammeStatus = "PENDING_JUDGMENT";
    if (reportedTotal > 0 && reportedPublished === reportedTotal) {
      status = "PUBLISHED";
    } else if (reportedTotal > 0 && reportedScored === reportedTotal) {
      status = "PENDING_PUBLICATION";
    }

    let finalResultNumber = programme.resultNumber;
    if (
      ["PENDING_PUBLICATION", "PUBLISHED", "ANNOUNCED"].includes(status) &&
      finalResultNumber === null
    ) {
      const nextNumRes = await db
        .select({ maxNum: max(programmeTable.resultNumber) })
        .from(programmeTable)
        .where(eq(programmeTable.festivalId, programme.festivalId));
      finalResultNumber = (nextNumRes[0]?.maxNum ?? 0) + 1;
    }

    await db
      .update(programmeTable)
      .set({
        status,
        resultNumber: finalResultNumber,
        publishedAt: status === "PUBLISHED" ? serverNowIso() : null,
        updatedAt: serverNowIso(),
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
        (programme.maxParticipantsPerTeam ?? 1);

  const isFullyAssignedAcrossAllGroups =
    expectedAssignmentsTotal > 0 &&
    assignmentCount[0].c >= expectedAssignmentsTotal;
  const allAssignmentsHaveResult =
    assignmentCount[0].c > 0 && resultCount[0].c >= assignmentCount[0].c;
  const allResultsPublished =
    resultCount[0].c > 0 && publishedResultCount[0].c >= resultCount[0].c;

  const isBasic = isBasicTier(programme.festival.tier);

  let status: ProgrammeStatus;

  if (isBasic) {
    if (allResultsPublished) {
      status = "PUBLISHED";
    } else if (allAssignmentsHaveResult) {
      status = "PENDING_PUBLICATION";
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
      programme.status === "CANCELLED"
    ) {
      status = "CANCELLED";
    } else {
      status = computePreWorksStatus({
        hasAssignments,
        hasScheduleEntry,
        isFullyAssignedAcrossAllGroups,
        isBasic,
      });
    }
  }

  let finalResultNumber = programme.resultNumber;
  if (
    ["PENDING_PUBLICATION", "PUBLISHED", "ANNOUNCED"].includes(status) &&
    finalResultNumber === null
  ) {
    const nextNumRes = await db
      .select({ maxNum: max(programmeTable.resultNumber) })
      .from(programmeTable)
      .where(eq(programmeTable.festivalId, programme.festivalId));
    finalResultNumber = (nextNumRes[0]?.maxNum ?? 0) + 1;
  }

  await db
    .update(programmeTable)
    .set({
      status,
      resultNumber: finalResultNumber,
      publishedAt: status === "PUBLISHED" ? serverNowIso() : null,
      updatedAt: serverNowIso(),
    })
    .where(eq(programmeTable.id, programmeId));

  return status;
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
      publishedAt: serverNowIso(),
      updatedAt: serverNowIso(),
    })
    .where(eq(programmeTable.id, programmeId));
}

export function assertProgrammePreReporting(status: ProgrammeStatus) {
  if (
    [
      "REPORTING",
      "PENDING_JUDGMENT",
      "JUDGING",
      "PENDING_PUBLICATION",
      "PUBLISHED",
      "ANNOUNCED",
      "CANCELLED",
    ].includes(status)
  ) {
    throw new AppError("Programme is locked for modification because reporting or judging has already started.");
  }
}

export function assertProgrammePrePublishing(status: ProgrammeStatus) {
  if (["PUBLISHED", "ANNOUNCED"].includes(status)) {
    throw new AppError("Programme results are already published.");
  }
}
