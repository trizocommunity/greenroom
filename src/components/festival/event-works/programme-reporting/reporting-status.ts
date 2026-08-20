import { format } from "date-fns";
import type { CompactHistoryItem } from "@/components/dashboard/event-works/CompactHistoryList";
import { formatDateTime, parseInstant } from "@/core/datetime";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { teamKey } from "@/features/programmes/domain/team-key";
import { requireProgrammeType } from "@/features/programmes/utils/assert-programme-type";
import type { ReportingBoardItem } from "./types";

export type ReportingUiStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "RESET"
  | "TIMED_OUT"
  | "CLOSED";

/** User-facing labels: RESET = window stopped without submit; CLOSED = submit & codes issued. */
export function reportingSessionStatusLabel(status: string): string {
  switch (status) {
    case "RESET":
      return "Reporting closed";
    case "TIMED_OUT":
      return "Reporting ended";
    case "CLOSED":
      return "Reporting ended";
    case "IN_PROGRESS":
      return "In progress";
    case "NOT_STARTED":
      return "Not started";
    default:
      return status;
  }
}

/**
 * Promotes an IN_PROGRESS session whose window has already passed into TIMED_OUT,
 * but only on the client — server-rendered status must not flip before hydration.
 */
export function getUiReportingStatus(
  status: string | undefined,
  windowEndsAt: Date | null | undefined,
  isClient: boolean = false,
): ReportingUiStatus {
  if (
    status === "IN_PROGRESS" &&
    windowEndsAt != null &&
    isClient &&
    windowEndsAt.getTime() <= Date.now()
  ) {
    return "TIMED_OUT";
  }
  return (status ?? "NOT_STARTED") as ReportingUiStatus;
}

export function formatHistoryTime(value: Date | string | null): string {
  const date = parseInstant(value);
  if (!date) return "—";
  return format(date, "h:mm a");
}

function partialTeamKey(
  row: Pick<ProgrammeReportingAssignmentRow, "groupId" | "teamNumber">,
): string {
  return teamKey.partial({ groupId: row.groupId, teamNumber: row.teamNumber });
}

/**
 * Group assignments by (groupId, teamNumber). Used by both the roster builder
 * (one row per team, members reported status OR'd together) and the history
 * timeline (one timeline entry per team).
 */
export function bucketAssignmentsByTeam<
  T extends Pick<ProgrammeReportingAssignmentRow, "groupId" | "teamNumber">,
>(assignments: T[]): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const row of assignments) {
    const key = partialTeamKey(row);
    const bucket = buckets.get(key) ?? [];
    bucket.push(row);
    buckets.set(key, bucket);
  }
  return buckets;
}

function historyStatusRank(status: string): number {
  switch (status) {
    case "CLOSED":
      return 0;
    case "TIMED_OUT":
      return 1;
    case "RESET":
      return 2;
    default:
      return 99;
  }
}

function getHistoryTimestamp(item: ReportingBoardItem): number {
  const endedAt = item.reportingSession?.endedAt
    ? (parseInstant(item.reportingSession.endedAt)?.getTime() ?? Number.NaN)
    : Number.NaN;
  if (Number.isFinite(endedAt)) return endedAt;
  const updatedAt = item.reportingSession?.updatedAt
    ? (parseInstant(item.reportingSession.updatedAt)?.getTime() ?? Number.NaN)
    : Number.NaN;
  if (Number.isFinite(updatedAt)) return updatedAt;
  return parseInstant(item.startTime)?.getTime() ?? 0;
}

/**
 * Pure builder for the history-drawer list rows. The drawer consumes the
 * `CompactHistoryItem` shape; the heavy detail map is built separately by
 * `buildProgrammeHistoryDetails` so this stays render-cheap.
 */
export function buildProgrammeHistory(
  board: ReportingBoardItem[],
  mounted: boolean,
): CompactHistoryItem[] {
  return board
    .map((item) => ({
      item,
      status: getUiReportingStatus(
        item.reportingSession?.status,
        item.reportingSession?.windowEndsAt ?? null,
        mounted,
      ),
    }))
    .filter(({ status }) => ["CLOSED", "RESET", "TIMED_OUT"].includes(status))
    .sort((a, b) => {
      const rankDelta =
        historyStatusRank(a.status) - historyStatusRank(b.status);
      if (rankDelta !== 0) return rankDelta;
      const timeDelta =
        getHistoryTimestamp(b.item) - getHistoryTimestamp(a.item);
      if (timeDelta !== 0) return timeDelta;
      return (a.item.programme?.name ?? "").localeCompare(
        b.item.programme?.name ?? "",
      );
    })
    .map(({ item, status }) => {
      const programmeType = requireProgrammeType(
        item.programme?.type,
        `programme reporting: programme ${item.programme?.id ?? "unknown"}`,
      );
      const programmeStatus = (item.programme?.status ?? "").toUpperCase();
      const reportedRows =
        item.reportingSession?.programmeReportedParticipants ?? [];
      const codeLetters = item.reportingSession?.programmeCodeLetters ?? [];

      const reportedCount =
        programmeType === "GROUP"
          ? new Set(
              reportedRows.map((r) =>
                partialTeamKey({
                  groupId: r.groupId,
                  teamNumber: r.teamNumber,
                }),
              ),
            ).size
          : reportedRows.length;

      const reportedLabel =
        programmeType === "GROUP" ? "teams reported" : "reported";
      const codeLabel = programmeType === "GROUP" ? "team codes" : "codes";
      const tinyBadge =
        programmeStatus.includes("COMPLETED") ||
        programmeStatus.includes("PUBLISHED")
          ? "Judged"
          : null;

      return {
        id: item.id,
        title: item.programme?.name ?? "Unknown programme",
        badge: reportingSessionStatusLabel(status),
        tinyBadge,
        metaPrimary: `${item.stage?.name ?? "No stage"} • ${formatHistoryTime(item.startTime)}`,
        metaSecondary: `${item.programme?.category?.name ?? "No category"} • ${item.programme?.type ?? "—"}`,
        detailSummary: `${reportedCount} ${reportedLabel} • ${codeLetters.length} ${codeLabel}`,
      };
    });
}

export type ProgrammeHistoryDetail = {
  programmeName: string;
  categoryName: string;
  stageName: string;
  type: "INDIVIDUAL" | "GROUP" | "—";
  statusLabel: string;
  timeline: Array<{ title: string; at: string; note?: string }>;
  startTimeLabel: string;
  reportedCount: number;
  codeCount: number;
  rows: Array<{ label: string; group: string; code: string }>;
  participantTimeline: Array<{
    key: string;
    label: string;
    chestOrTeam: string;
    group: string;
    reportedAt: string | null;
    spunAt: string | null;
    code: string;
    membersCount?: number | null;
    teamMemberNames?: string[];
  }>;
};

/**
 * Pure builder for the heavy history-drawer detail payload. Maps by board
 * item id, so the orchestrator can resolve a single detail by open-id in O(1).
 */
export function buildProgrammeHistoryDetails(
  board: ReportingBoardItem[],
  assignments: ProgrammeReportingAssignmentRow[],
  mounted: boolean,
): Map<string, ProgrammeHistoryDetail> {
  const details = new Map<string, ProgrammeHistoryDetail>();

  for (const item of board) {
    const uiStatus = getUiReportingStatus(
      item.reportingSession?.status,
      item.reportingSession?.windowEndsAt ?? null,
      mounted,
    );
    if (!["CLOSED", "RESET", "TIMED_OUT"].includes(uiStatus)) continue;

    const programmeId = item.programme?.id;
    const programmeType = item.programme?.type ?? "—";
    const reportedIds = new Set(
      item.reportingSession?.programmeReportedParticipants.map(
        (r) => r.assignmentId,
      ) ?? [],
    );
    const assignedCodes = item.reportingSession?.programmeCodeLetters ?? [];
    const codeByParticipantId = new Map<string, string>();
    const spunAtByParticipantId = new Map<string, string>();
    for (const c of assignedCodes) {
      for (const recipient of c.programmeCodeLetterRecipients) {
        codeByParticipantId.set(recipient.participantId, c.code);
        if (c.issuedAt) {
          spunAtByParticipantId.set(recipient.participantId, c.issuedAt);
        }
      }
    }

    const programmeAssignments = assignments.filter(
      (a) => a.programmeId === programmeId && reportedIds.has(a.id),
    );

    const rows =
      programmeType === "GROUP"
        ? Array.from(bucketAssignmentsByTeam(programmeAssignments)).map(
            ([, members]) => {
              const lead = members[0];
              const firstParticipantId =
                members.find((m) => m.participantId)?.participantId ??
                members.find((m) => m.teamParticipantIds?.length)
                  ?.teamParticipantIds?.[0] ??
                null;
              return {
                label:
                  lead?.teamNumber && lead.teamNumber > 0
                    ? `${lead.groupName ?? "Group"} · Party ${lead.teamNumber}`
                    : (lead?.groupName ?? "Party"),
                group: lead?.groupName ?? "—",
                code:
                  (firstParticipantId
                    ? codeByParticipantId.get(firstParticipantId)
                    : null) ?? "—",
              };
            },
          )
        : programmeAssignments.map((row) => ({
            label: row.participantName ?? "—",
            group: row.groupName ?? "—",
            code: row.participantId
              ? (codeByParticipantId.get(row.participantId) ?? "—")
              : "—",
          }));

    const reportedByAssignmentId = new Map(
      (item.reportingSession?.programmeReportedParticipants ?? []).map((r) => [
        r.assignmentId,
        r,
      ]),
    );

    const rawParticipantTimeline =
      programmeType === "GROUP"
        ? Array.from(bucketAssignmentsByTeam(programmeAssignments)).map(
            ([teamKey, members]) => {
              const lead = members[0];
              const firstReported = members
                .map((m) => reportedByAssignmentId.get(m.id))
                .find(Boolean);
              const firstParticipantId =
                members.find((m) => m.participantId)?.participantId ??
                members.find((m) => m.teamParticipantIds?.length)
                  ?.teamParticipantIds?.[0] ??
                null;
              const code = firstParticipantId
                ? (codeByParticipantId.get(firstParticipantId) ?? "—")
                : "—";
              const spunAt = firstParticipantId
                ? (spunAtByParticipantId.get(firstParticipantId) ?? null)
                : null;
              const teamLabel = lead?.teamNumber
                ? `Party ${lead.teamNumber}`
                : "Party";

              return {
                key: teamKey,
                label: lead?.teamLeadName
                  ? `${lead.teamLeadName} & ${teamLabel}`
                  : lead?.participantName
                    ? `${lead.participantName} & ${teamLabel}`
                    : teamLabel,
                chestOrTeam: teamLabel,
                group: lead?.groupName ?? "—",
                reportedAt: firstReported?.reportedAt ?? null,
                spunAt,
                code,
                membersCount:
                  lead?.teamParticipantIds?.length || members.length,
                teamMemberNames: lead?.teamMemberNames?.length
                  ? lead.teamMemberNames
                  : members
                      .slice(1)
                      .map((m) => m.participantName)
                      .filter(Boolean) as string[],
              };
            },
          )
        : programmeAssignments.map((row) => {
            const reported = reportedByAssignmentId.get(row.id);
            const code = row.participantId
              ? (codeByParticipantId.get(row.participantId) ?? "—")
              : "—";
            const spunAt = row.participantId
              ? (spunAtByParticipantId.get(row.participantId) ?? null)
              : null;
            return {
              key: row.id,
              label: row.participantName ?? "—",
              chestOrTeam: row.chestNumber
                ? `Chest ${row.chestNumber}`
                : "Chest —",
              group: row.groupName ?? "—",
              reportedAt: reported?.reportedAt ?? null,
              spunAt,
              code,
              membersCount: null,
            };
          });

    const participantTimeline = rawParticipantTimeline.sort((a, b) => {
      const codeA = a.code !== "—" ? a.code : null;
      const codeB = b.code !== "—" ? b.code : null;

      if (codeA && codeB) return codeA.localeCompare(codeB);
      if (codeA) return -1;
      if (codeB) return 1;

      // Fallback to reported time
      const timeA = a.reportedAt ? new Date(a.reportedAt).getTime() : Infinity;
      const timeB = b.reportedAt ? new Date(b.reportedAt).getTime() : Infinity;
      return timeA - timeB;
    });

    details.set(item.id, {
      programmeName: item.programme?.name ?? "Unknown programme",
      categoryName: item.programme?.category?.name ?? "No category",
      stageName: item.stage?.name ?? "No stage",
      type: programmeType,
      statusLabel: reportingSessionStatusLabel(uiStatus),
      timeline: [
        {
          title: "Scheduled slot",
          at: formatDateTime(item.startTime, {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          note: `${item.stage?.name ?? "No stage"} • ${item.programme?.type ?? "—"}`,
        },
        {
          title: "Reporting status",
          at:
            item.reportingSession?.windowEndsAt != null
              ? formatDateTime(item.reportingSession.windowEndsAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : formatDateTime(item.startTime, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
          note: reportingSessionStatusLabel(uiStatus),
        },
        {
          title: "Summary snapshot",
          at: formatDateTime(item.startTime, {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          note: `${reportedIds.size} reported • ${assignedCodes.length} codes`,
        },
      ],
      startTimeLabel: formatDateTime(item.startTime, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      reportedCount: reportedIds.size,
      codeCount: assignedCodes.length,
      rows,
      participantTimeline,
    });
  }

  return details;
}

/** Sort the board list: active timers first, then live, then ready, then by start time. */
export function sortReportingBoard(
  board: ReportingBoardItem[],
  mounted: boolean,
): ReportingBoardItem[] {
  const isTimerActive = (item: ReportingBoardItem) => {
    if (item.reportingSession?.status !== "CLOSED") return false;
    const windowEndsAt = item.reportingSession?.windowEndsAt
      ? parseInstant(item.reportingSession.windowEndsAt)
      : null;
    if (!windowEndsAt) return false;
    return Date.now() < windowEndsAt.getTime();
  };

  const getRank = (item: ReportingBoardItem, status: string) => {
    if (status === "CLOSED" && isTimerActive(item)) return 0;
    if (status === "IN_PROGRESS") return 1;
    if (status === "NOT_STARTED") return 2;
    return 3;
  };

  return [...board].sort((a, b) => {
    const aStatus = getUiReportingStatus(
      a.reportingSession?.status,
      a.reportingSession?.windowEndsAt ?? null,
      mounted,
    );
    const bStatus = getUiReportingStatus(
      b.reportingSession?.status,
      b.reportingSession?.windowEndsAt ?? null,
      mounted,
    );

    const ra = getRank(a, aStatus);
    const rb = getRank(b, bStatus);
    if (ra !== rb) return ra - rb;

    const aTime = a.startTime
      ? a.startTime.getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = b.startTime
      ? b.startTime.getTime()
      : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;

    return a.programme.name.localeCompare(b.programme.name);
  });
}
