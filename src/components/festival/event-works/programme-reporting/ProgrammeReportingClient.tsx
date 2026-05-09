"use client";

import {
  BarChart3,
  Clock,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Users2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import party from "party-js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CompactHistoryList } from "@/components/dashboard/event-works/CompactHistoryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
import { formatStoredDateTime, parseStoredInstant } from "@/core/utils/date-time";
import {
  assignCodeLettersWithSpinAction,
  closeProgrammeReportingAction,
  getReportingStatsAction,
  markProgrammeAssignmentsBulkAction,
  markProgrammeParticipantAction,
  reopenProgrammeReportingAction,
  resetProgrammeReportingAction,
  resetSpinCodeLettersAction,
  startProgrammeReportingAction,
} from "@/features/programmes/actions/programme-reporting.actions";
import { getCodeForStudentFromLetters } from "@/features/programmes/services/programme-reporting-code";
import { CodeLetterSpinWheel } from "./CodeLetterSpinWheel";
import { QrScanner } from "./QrScanner";
import { ReportingQuickAddSection } from "./ReportingQuickAddSection";
import { ReportingBoardList } from "./ReportingBoardList";
import { ReportingRosterTable } from "./ReportingRosterTable";
import { ReportingStats } from "./ReportingStats";
import type {
  AssignmentWithReported,
  ProgrammeReportingAssignmentRow,
  ReportingBoardItem,
  RosterTableRow,
} from "./types";

/** User-facing labels: RESET = window stopped without submit; CLOSED = submit & codes issued. */
function reportingSessionStatusLabel(status: string): string {
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

function getUiReportingStatus(
  status: string | undefined,
  windowEndsAt: Date | null | undefined,
  isClient: boolean = false,
): string {
  if (
    status === "IN_PROGRESS" &&
    windowEndsAt != null &&
    isClient &&
    windowEndsAt.getTime() <= Date.now()
  ) {
    return "TIMED_OUT";
  }
  return status ?? "NOT_STARTED";
}

function generateCodeLetters(count: number): string[] {
  const safeCount = Math.max(1, count);
  const letters: string[] = [];
  for (let i = 1; i <= safeCount; i++) {
    let n = i;
    let value = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      value = String.fromCharCode(65 + rem) + value;
      n = Math.floor((n - 1) / 26);
    }
    letters.push(value);
  }
  return letters;
}

function formatHistoryTime(value: Date | string): string {
  const date = parseStoredInstant(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function ProgrammeReportingClient({
  festivalId,
  board,
  assignments,
  festivalStages,
}: {
  festivalId: string;
  board: ReportingBoardItem[];
  assignments: ProgrammeReportingAssignmentRow[];
  /** All festival stages (filter dropdown); board alone only lists stages that appear on slots. */
  festivalStages: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterCategoryId, setFilterCategoryId] = useState<string>("ALL");
  const [filterStageId, setFilterStageId] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "INDIVIDUAL" | "GROUP">(
    "ALL",
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  /** Up next = actionable sessions only; Full list = include ended + all filters */
  const [boardListMode, setBoardListMode] = useState<"queue" | "all">("queue");
  const [scanSectionOpen, setScanSectionOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [activeAction, setActiveAction] = useState<
    | null
    | "start"
    | "reset"
    | "close"
    | "mark"
    | "reopen"
    | "reset-codes"
    | "random-spin"
  >(null);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [optimisticReportedBySession, setOptimisticReportedBySession] =
    useState<Record<string, Set<string>>>({});
  const [reportingStats, setReportingStats] = useState<{
    total: number;
    reported: number;
    remaining: number;
    percentageComplete: number;
    elapsedMinutes: number;
    estimatedRemainingMinutes: number | null;
    estimatedEnd: Date | null;
  } | null>(null);
  const [isEntrySwitching, setIsEntrySwitching] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [activeSpinRow, setActiveSpinRow] = useState<RosterTableRow | null>(
    null,
  );
  const [isSpinWheelOpen, setIsSpinWheelOpen] = useState(false);
  const [spinPendingAssignmentId, setSpinPendingAssignmentId] = useState<
    string | null
  >(null);
  const [spinAssignRequested, setSpinAssignRequested] = useState(false);
  const [historyDetailOpenId, setHistoryDetailOpenId] = useState<string | null>(
    null,
  );
  const confettiRef = useRef<HTMLDivElement>(null);

  // Polling refresh every 10 seconds for updates
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 10000);
    return () => window.clearInterval(id);
  }, [router]);

  useEffect(() => {
    const t = window.setTimeout(() => setIsInitialLoading(false), 250);
    return () => window.clearTimeout(t);
  }, []);

  const assignmentCountByProgrammeId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      m.set(a.programmeId, (m.get(a.programmeId) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of board) {
      const c = item.programme?.category;
      if (c?.id) map.set(c.id, c.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [board]);

  const stages = useMemo(() => {
    if (festivalStages.length > 0) return festivalStages;
    const map = new Map<string, string>();
    for (const item of board) {
      if (item.stage?.id) map.set(item.stage.id, item.stage.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [board, festivalStages]);

  const filteredBoard = useMemo(() => {
    const effectiveStatusFilter =
      boardListMode === "queue" ? "ALL" : filterStatus;

    const filtered = board.filter((item) => {
      const status = getUiReportingStatus(
        item.reportingSession?.status,
        item.reportingSession?.windowEndsAt ?? null,
        mounted,
      );
      if (boardListMode === "queue" && status === "CLOSED") return false;

      const matchesStatus =
        effectiveStatusFilter === "ALL" ||
        status === effectiveStatusFilter ||
        (effectiveStatusFilter === "RESET" && status === "TIMED_OUT");
      if (!matchesStatus) return false;
      if (
        filterCategoryId !== "ALL" &&
        item.programme?.category?.id !== filterCategoryId
      ) {
        return false;
      }
      if (filterStageId !== "ALL" && item.stage?.id !== filterStageId)
        return false;
      if (filterType !== "ALL" && item.programme?.type !== filterType)
        return false;
      return true;
    });

    const statusRank = (s: string): number => {
      if (boardListMode === "queue") {
        switch (s) {
          case "IN_PROGRESS":
            return 0;
          case "NOT_STARTED":
            return 1;
          case "RESET":
          case "TIMED_OUT":
            return 2;
          default:
            return 999;
        }
      }
      switch (s) {
        case "IN_PROGRESS":
          return 0;
        case "NOT_STARTED":
          return 1;
        case "RESET":
        case "TIMED_OUT":
          return 2;
        case "CLOSED":
          return 3;
        default:
          return 999;
      }
    };

    return filtered.sort((a, b) => {
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
      const ra = statusRank(aStatus);
      const rb = statusRank(bStatus);
      if (ra !== rb) return ra - rb;
      return (
        parseStoredInstant(a.startTime).getTime() -
        parseStoredInstant(b.startTime).getTime()
      );
    });
  }, [
    board,
    boardListMode,
    filterStatus,
    filterCategoryId,
    filterStageId,
    filterType,
    mounted,
  ]);

  const reportingHistoryItems = useMemo(() => {
    const historyStatusRank = (status: string) => {
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
    };

    const getHistoryTimestamp = (item: ReportingBoardItem) => {
      const endedAt = item.reportingSession?.endedAt
        ? parseStoredInstant(item.reportingSession.endedAt).getTime()
        : Number.NaN;
      if (Number.isFinite(endedAt)) return endedAt;
      const updatedAt = item.reportingSession?.updatedAt
        ? parseStoredInstant(item.reportingSession.updatedAt).getTime()
        : Number.NaN;
      if (Number.isFinite(updatedAt)) return updatedAt;
      return parseStoredInstant(item.startTime).getTime();
    };

    return board
      .map((item) => {
        const status = getUiReportingStatus(
          item.reportingSession?.status,
          item.reportingSession?.windowEndsAt ?? null,
          mounted,
        );
        return {
          item,
          status,
        };
      })
      .filter(({ status }) => ["CLOSED", "RESET", "TIMED_OUT"].includes(status))
      .sort((a, b) => {
        const rankDelta = historyStatusRank(a.status) - historyStatusRank(b.status);
        if (rankDelta !== 0) return rankDelta;

        const timeDelta = getHistoryTimestamp(b.item) - getHistoryTimestamp(a.item);
        if (timeDelta !== 0) return timeDelta;

        return (a.item.programme?.name ?? "").localeCompare(b.item.programme?.name ?? "");
      })
      .map(({ item, status }) => {
        const programmeType = item.programme?.type ?? "INDIVIDUAL";
        const programmeStatus = (item.programme?.status ?? "").toUpperCase();
        const reportedRows = item.reportingSession?.programmeReportedParticipants ?? [];
        const codeLetters = item.reportingSession?.programmeCodeLetters ?? [];

        const reportedCount =
          programmeType === "GROUP"
            ? new Set(
                reportedRows.map(
                  (r) => `${r.groupId ?? "no-group"}::${r.teamNumber ?? 0}`,
                ),
              ).size
            : reportedRows.length;

        const reportedLabel = programmeType === "GROUP" ? "teams reported" : "reported";
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
  }, [board, mounted]);

  const reportingHistoryDetailsById = useMemo(() => {
    const details = new Map<
      string,
      {
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
        }>;
      }
    >();

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
        item.reportingSession?.programmeReportedParticipants.map((r) => r.assignmentId) ?? [],
      );
      const assignedCodes = item.reportingSession?.programmeCodeLetters ?? [];
      const codeByStudentId = new Map<string, string>();
      const spunAtByStudentId = new Map<string, string>();
      for (const c of assignedCodes) {
        for (const recipient of c.programmeCodeLetterRecipients) {
          codeByStudentId.set(recipient.studentId, c.code);
          if (c.issuedAt) {
            spunAtByStudentId.set(recipient.studentId, c.issuedAt);
          }
        }
      }

      const programmeAssignments = assignments.filter(
        (a) => a.programmeId === programmeId && reportedIds.has(a.id),
      );

      const rows =
        programmeType === "GROUP"
          ? Array.from(
              programmeAssignments.reduce(
                (acc, row) => {
                  const key = `${row.groupId ?? "no-group"}::${row.teamNumber ?? 0}`;
                  const current = acc.get(key) ?? [];
                  current.push(row);
                  acc.set(key, current);
                  return acc;
                },
                new Map<string, ProgrammeReportingAssignmentRow[]>(),
              ),
            ).map(([, members]) => {
              const lead = members[0];
              const firstStudentId = members.find((m) => m.studentId)?.studentId ?? null;
              return {
                label:
                  lead?.teamNumber && lead.teamNumber > 0
                    ? `${lead.groupName ?? "Group"} · Team ${lead.teamNumber}`
                    : (lead?.groupName ?? "Team"),
                group: lead?.groupName ?? "—",
                code:
                  (firstStudentId ? codeByStudentId.get(firstStudentId) : null) ?? "—",
              };
            })
          : programmeAssignments.map((row) => ({
              label: row.studentName ?? "—",
              group: row.groupName ?? "—",
              code: row.studentId ? (codeByStudentId.get(row.studentId) ?? "—") : "—",
            }));

      const reportedByAssignmentId = new Map(
        (item.reportingSession?.programmeReportedParticipants ?? []).map((r) => [
          r.assignmentId,
          r,
        ]),
      );

      const participantTimeline =
        programmeType === "GROUP"
          ? Array.from(
              programmeAssignments.reduce(
                (acc, row) => {
                  const key = `${row.groupId ?? "no-group"}::${row.teamNumber ?? 0}`;
                  const current = acc.get(key) ?? [];
                  current.push(row);
                  acc.set(key, current);
                  return acc;
                },
                new Map<string, ProgrammeReportingAssignmentRow[]>(),
              ),
            ).map(([teamKey, members]) => {
              const lead = members[0];
              const firstReported = members
                .map((m) => reportedByAssignmentId.get(m.id))
                .find(Boolean);
              const firstStudentId = members.find((m) => m.studentId)?.studentId ?? null;
              const code = firstStudentId ? (codeByStudentId.get(firstStudentId) ?? "—") : "—";
              const spunAt = firstStudentId
                ? (spunAtByStudentId.get(firstStudentId) ?? null)
                : null;
              const teamLabel = lead?.teamNumber
                ? `Team ${lead.teamNumber}`
                : "Team";

              return {
                key: teamKey,
                label: lead?.groupName ?? "Group",
                chestOrTeam: teamLabel,
                group: lead?.groupName ?? "—",
                reportedAt: firstReported?.reportedAt ?? null,
                spunAt,
                code,
              };
            })
          : programmeAssignments.map((row) => {
              const reported = reportedByAssignmentId.get(row.id);
              const code = row.studentId ? (codeByStudentId.get(row.studentId) ?? "—") : "—";
              const spunAt = row.studentId
                ? (spunAtByStudentId.get(row.studentId) ?? null)
                : null;
              return {
                key: row.id,
                label: row.studentName ?? "—",
                chestOrTeam: row.chestNumber ? `Chest ${row.chestNumber}` : "Chest —",
                group: row.groupName ?? "—",
                reportedAt: reported?.reportedAt ?? null,
                spunAt,
                code,
              };
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
            at: formatStoredDateTime(item.startTime, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
            note: `${item.stage?.name ?? "No stage"} • ${item.programme?.type ?? "—"}`,
          },
          {
            title: "Reporting status",
            at:
              item.reportingSession?.windowEndsAt != null
                ? formatStoredDateTime(item.reportingSession.windowEndsAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : formatStoredDateTime(item.startTime, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
            note: reportingSessionStatusLabel(uiStatus),
          },
          {
            title: "Summary snapshot",
            at: formatStoredDateTime(item.startTime, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
            note: `${reportedIds.size} reported • ${assignedCodes.length} codes`,
          },
        ],
        startTimeLabel: formatStoredDateTime(item.startTime, {
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
  }, [board, assignments, mounted]);

  const historyDetail = historyDetailOpenId
    ? reportingHistoryDetailsById.get(historyDetailOpenId) ?? null
    : null;

  useEffect(() => {
    if (!filteredBoard.length) {
      setSelectedEntryId(null);
      return;
    }
    if (
      selectedEntryId &&
      !filteredBoard.some((e) => e.id === selectedEntryId)
    ) {
      setSelectedEntryId(null);
    }
  }, [filteredBoard, selectedEntryId]);

  const selected = useMemo(
    () => board.find((item) => item.id === selectedEntryId) ?? null,
    [board, selectedEntryId],
  );

  useEffect(() => {
    const sid = selected?.reportingSession?.id;
    if (!sid || !selected?.reportingSession) return;
    const next = new Set(
      selected.reportingSession.programmeReportedParticipants.map(
        (r) => r.assignmentId,
      ),
    );
    setOptimisticReportedBySession((prev) => ({ ...prev, [sid]: next }));
  }, [selected?.reportingSession]);

  const assignmentsWithReported = useMemo((): AssignmentWithReported[] => {
    if (!selected?.programme?.id) return [];
    const programmeId = selected.programme.id;
    const serverReported = new Set(
      selected.reportingSession?.programmeReportedParticipants?.map(
        (r) => r.assignmentId,
      ) ?? [],
    );
    const sessionId = selected.reportingSession?.id;
    const optimisticReported =
      sessionId != null ? optimisticReportedBySession[sessionId] : undefined;
    const reported = optimisticReported ?? serverReported;

    const base = assignments
      .filter((a) => a.programmeId === programmeId)
      .map((a) => ({ ...a, isReported: reported.has(a.id) }));

    return [...base].sort((a, b) => {
      const ga = a.groupId ?? "";
      const gb = b.groupId ?? "";
      if (ga !== gb) return ga.localeCompare(gb);
      if ((a.teamNumber ?? 0) !== (b.teamNumber ?? 0)) {
        return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
      }
      return (a.studentName ?? "").localeCompare(
        b.studentName ?? "",
        undefined,
        { sensitivity: "base" },
      );
    });
  }, [assignments, selected, optimisticReportedBySession]);

  const rosterTableRows = useMemo((): RosterTableRow[] => {
    const programme = selected?.programme;
    if (!programme?.id) return [];
    const rows = assignmentsWithReported;

    if (programme.type !== "GROUP") {
      return rows.map((a) => ({
        key: a.id,
        mode: "individual" as const,
        assignmentId: a.id,
        studentId: a.studentId,
        nameColumn: a.studentName ?? "—",
        groupName: a.groupName,
        teamCell: a.teamNumber ?? "—",
        isReported: a.isReported,
      }));
    }

    const byTeam = new Map<string, AssignmentWithReported[]>();
    for (const row of rows) {
      const key = `${row.groupId ?? "no-group"}::${row.teamNumber ?? 0}`;
      const bucket = byTeam.get(key) ?? [];
      bucket.push(row);
      byTeam.set(key, bucket);
    }

    const teamRows: RosterTableRow[] = Array.from(byTeam.entries()).map(
      ([teamKey, members]) => {
        const lead = members[0]!;
        const teamNumber = lead.teamNumber ?? 0;
        const teamStudentIds = members
          .map((m) => m.studentId)
          .filter((id): id is string => Boolean(id));
        return {
          key: teamKey,
          mode: "team",
          assignmentId: lead.id,
          groupId: lead.groupId,
          teamNumber,
          teamStudentIds,
          nameColumn:
            teamNumber > 0
              ? `${lead.groupName ?? "Group"} · Team ${teamNumber}`
              : (lead.groupName ?? "Team"),
          groupName: lead.groupName,
          teamCell: teamNumber,
          isReported: members.some((m) => m.isReported),
        };
      },
    );

    return teamRows.sort((a, b) => {
      const ga = (a.groupName ?? "").localeCompare(b.groupName ?? "", undefined, {
        sensitivity: "base",
      });
      if (ga !== 0) return ga;
      const aTeam = typeof a.teamCell === "number" ? a.teamCell : Number(a.teamCell) || 0;
      const bTeam = typeof b.teamCell === "number" ? b.teamCell : Number(b.teamCell) || 0;
      return aTeam - bTeam;
    });
  }, [assignmentsWithReported, selected?.programme]);

  const reportedUnitsCount = useMemo(
    () => rosterTableRows.filter((r) => r.isReported).length,
    [rosterTableRows],
  );

  const session = selected?.reportingSession;

  /** Submit is allowed only when every present participant has a spun code letter. */
  const allReportedHaveCodeLetters = useMemo(() => {
    const letters = session?.programmeCodeLetters ?? [];

    const hasCodeForRow = (row: RosterTableRow) => {
      if (row.mode === "team") {
        return row.teamStudentIds.some(
          (sid) => getCodeForStudentFromLetters(letters, sid) != null,
        );
      }
      return row.studentId
        ? getCodeForStudentFromLetters(letters, row.studentId) != null
        : false;
    };

    for (const row of rosterTableRows) {
      if (!row.isReported) continue;
      if (!hasCodeForRow(row)) return false;
    }
    return true;
  }, [rosterTableRows, session?.programmeCodeLetters]);

  const sessionStatus = getUiReportingStatus(
    session?.status,
    session?.windowEndsAt ?? null,
    mounted,
  );
  const isTimedOut = sessionStatus === "TIMED_OUT";
  const isReset = sessionStatus === "RESET";
  const isPreStart =
    !session ||
    sessionStatus === "NOT_STARTED" ||
    sessionStatus === "RESET" ||
    isTimedOut;
  const isInProgress = sessionStatus === "IN_PROGRESS";
  const isClosed = sessionStatus === "CLOSED";

  // Fetch reporting stats every 30 seconds when session is in progress
  useEffect(() => {
    if (!session?.id || sessionStatus !== "IN_PROGRESS") {
      setReportingStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        const result = await getReportingStatsAction(festivalId, session.id);
        if (result.success) {
          setReportingStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch reporting stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [session?.id, sessionStatus, festivalId]);

  // Collect all already assigned codes to prevent duplicates during spin
  const alreadyAssignedCodes = useMemo(() => {
    if (!session?.programmeCodeLetters) return [];
    return session.programmeCodeLetters.map((cl) => cl.code);
  }, [session?.programmeCodeLetters]);

  const handleSpinResult = async (code: string) => {
    if (!activeSpinRow || !session) return;
    setSpinAssignRequested(true);

    try {
      const assignment = {
        teamNumber:
          activeSpinRow.mode === "team" ? activeSpinRow.teamNumber : null,
        groupId: activeSpinRow.mode === "team" ? activeSpinRow.groupId : null,
        studentId:
          activeSpinRow.mode === "individual" ? activeSpinRow.studentId : null,
        code,
      };

      const result = await assignCodeLettersWithSpinAction(
        festivalId,
        session.id,
        [assignment],
      );

      if (result.success) {
        toast.success(`Code ${code} · ${activeSpinRow.nameColumn}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to assign code");
      console.error(error);
      setSpinPendingAssignmentId(null);
    }
  };

  const handleSpinWheelOpenChange = (open: boolean) => {
    setIsSpinWheelOpen(open);
    if (!open) {
      if (!spinAssignRequested) {
        setSpinPendingAssignmentId(null);
      }
      setActiveSpinRow(null);
      setSpinAssignRequested(false);
    }
  };

  function getIssuedCodeForRow(row: RosterTableRow): string | null {
    const letters = session?.programmeCodeLetters ?? [];
    if (row.mode === "team") {
      for (const sid of row.teamStudentIds) {
        const code = getCodeForStudentFromLetters(letters, sid);
        if (code) return code;
      }
      return null;
    }
    return row.studentId ? getCodeForStudentFromLetters(letters, row.studentId) : null;
  }

  useEffect(() => {
    if (!spinPendingAssignmentId) return;

    const pendingRow = rosterTableRows.find(
      (row) => row.assignmentId === spinPendingAssignmentId,
    );
    if (!pendingRow) {
      setSpinPendingAssignmentId(null);
      return;
    }

    const letters = session?.programmeCodeLetters ?? [];
    const hasIssuedCode =
      pendingRow.mode === "team"
        ? pendingRow.teamStudentIds.some(
            (studentId) => getCodeForStudentFromLetters(letters, studentId) != null,
          )
        : pendingRow.studentId != null
          ? getCodeForStudentFromLetters(letters, pendingRow.studentId) != null
          : false;

    if (hasIssuedCode) {
      setSpinPendingAssignmentId(null);
    }
  }, [spinPendingAssignmentId, rosterTableRows, session?.programmeCodeLetters]);

  const onStart = () => {
    if (!selected) return;
    setActiveAction("start");
    startTransition(async () => {
      const res = await startProgrammeReportingAction(festivalId, selected.id);
      if (res.success) {
        toast.success("Reporting started");
        router.refresh();
      } else toast.error("Failed to start reporting");
      setActiveAction(null);
    });
  };

  const onReset = () => {
    if (!session?.id) return;
    setActiveAction("reset");
    startTransition(async () => {
      const res = await resetProgrammeReportingAction(festivalId, session.id);
      if (res.success) {
        const message =
          res.data && typeof res.data === "object" && "message" in res.data
            ? (res.data as { message: string }).message
            : "Reporting reset successfully";
        toast.success(message);
        router.refresh();
      } else toast.error("Failed to reset reporting");
      setActiveAction(null);
    });
  };

  const onResetCodeLetters = () => {
    if (!session?.id) return;
    setActiveAction("reset-codes");
    startTransition(async () => {
      try {
        const res = await resetSpinCodeLettersAction(festivalId, session.id);
        if (res.success) {
          setSpinPendingAssignmentId(null);
          setSpinAssignRequested(false);
          setIsSpinWheelOpen(false);
          setActiveSpinRow(null);
          toast.success("All code letters cleared. You can re-spin for everyone.");
          router.refresh();
        } else {
          toast.error("Failed to reset code letters");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reset code letters",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onRandomSpinAll = () => {
    if (!session?.id) return;

    const reportedRows = rosterTableRows.filter((row) => row.isReported);
    const rowsNeedingCode = reportedRows.filter((row) => !getIssuedCodeForRow(row));
    if (!rowsNeedingCode.length) {
      toast.info("All reported rows already have code letters.");
      return;
    }

    const existingCodes = new Set(alreadyAssignedCodes);
    const allCodes = generateCodeLetters(reportedRows.length);
    let availableCodes = allCodes.filter((code) => !existingCodes.has(code));

    if (availableCodes.length < rowsNeedingCode.length) {
      const expandedCodes = generateCodeLetters(
        reportedRows.length + rowsNeedingCode.length,
      );
      availableCodes = expandedCodes.filter((code) => !existingCodes.has(code));
    }

    if (availableCodes.length < rowsNeedingCode.length) {
      toast.error("Not enough unique code letters available for random assignment.");
      return;
    }

    const shuffledCodes = [...availableCodes].sort(() => Math.random() - 0.5);
    const assignments = rowsNeedingCode.map((row, index) => ({
      teamNumber: row.mode === "team" ? row.teamNumber : null,
      groupId: row.mode === "team" ? row.groupId : null,
      studentId: row.mode === "individual" ? row.studentId : null,
      code: shuffledCodes[index]!,
    }));

    setActiveAction("random-spin");
    startTransition(async () => {
      try {
        const res = await assignCodeLettersWithSpinAction(
          festivalId,
          session.id,
          assignments,
        );
        if (res.success) {
          toast.success(
            `Random spin assigned ${assignments.length} code letter${assignments.length > 1 ? "s" : ""}.`,
          );
          router.refresh();
        } else {
          toast.error("Failed to assign random code letters");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to assign random code letters",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onClose = () => {
    if (!session?.id) return;
    const programmeType = selected?.programme?.type;
    setActiveAction("close");
    startTransition(async () => {
      try {
        const res = await closeProgrammeReportingAction(festivalId, session.id);
        if (res.success) {
          if (confettiRef.current) {
            party.confetti(confettiRef.current, {
              count: party.variation.range(40, 60),
              size: party.variation.range(0.8, 1.2),
            });
          }
          toast.success(
            programmeType === "GROUP"
              ? "Reporting ended — each reported team received one code letter."
              : "Reporting ended — code letters issued to reported students.",
          );
          router.refresh();
        } else toast.error("Failed to submit reporting");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit reporting",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onReopen = () => {
    if (!session?.id) return;
    setActiveAction("reopen");
    startTransition(async () => {
      try {
        const res = await reopenProgrammeReportingAction(
          festivalId,
          session.id,
        );
        if (res.success) {
          const message =
            res.data && typeof res.data === "object" && "message" in res.data
              ? (res.data as { message: string }).message
              : "Reporting reopened successfully";
          toast.success(message);
          setIsReopenConfirmOpen(false);
          router.refresh();
        } else {
          toast.error("Failed to reopen reporting");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reopen reporting",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onMarkRow = async (row: RosterTableRow, checked: boolean) => {
    if (!session?.id) return;

    const ids = [row.assignmentId];

    // Optimistic update
    setOptimisticReportedBySession((prev) => {
      const next = new Set(prev[session.id] || []);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return { ...prev, [session.id]: next };
    });

    setMarkingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    try {
      await markProgrammeParticipantAction(
        festivalId,
        session.id,
        row.assignmentId,
        checked,
      );
    } catch (error) {
      toast.error("Failed to update status");
      router.refresh();
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="overflow-hidden border-violet-200/40 bg-linear-to-r from-violet-500/10 via-indigo-500/5 to-background">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Programme Reporting
            </p>
            <h2 className="text-base font-semibold sm:text-lg">
              Live check-in, code assignment, and submit
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Pick a programme from the queue, mark present participants, assign code letters, then submit.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-auto">
            <div className="rounded-lg border bg-background/70 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Queue</p>
              <p className="text-sm font-semibold">{filteredBoard.length}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">On roster</p>
              <p className="text-sm font-semibold">{rosterTableRows.length}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Present</p>
              <p className="text-sm font-semibold">{reportedUnitsCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-base inline-flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              Programmes
            </CardTitle>
            <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setBoardListMode("queue")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 transition-colors",
                  boardListMode === "queue"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Up next
              </button>
              <button
                type="button"
                onClick={() => setBoardListMode("all")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 transition-colors",
                  boardListMode === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Full list
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {boardListMode === "queue"
                ? "Not started and live sessions only. Pick a slot, then start reporting on the right."
                : "Includes ended sessions. Use status to find completed reporting."}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filterCategoryId}
                onValueChange={setFilterCategoryId}
              >
                <SelectTrigger className="h-8 text-[10px] uppercase font-bold tracking-tight">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStageId} onValueChange={setFilterStageId}>
                <SelectTrigger className="h-8 text-[10px] uppercase font-bold tracking-tight">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stages</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterType}
                onValueChange={(val: any) => setFilterType(val)}
              >
                <SelectTrigger className="h-8 text-[10px] uppercase font-bold tracking-tight">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                </SelectContent>
              </Select>

              {boardListMode === "all" ? (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-[10px] uppercase font-bold tracking-tight">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="NOT_STARTED">Not started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="RESET">Reporting closed</SelectItem>
                    <SelectItem value="CLOSED">Reporting ended</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-8 rounded-md border border-dashed border-transparent" />
              )}
            </div>

            <ReportingBoardList
              items={filteredBoard}
              selectedId={selectedEntryId}
              onSelect={(id) => {
                if (id === selectedEntryId) return;
                setIsEntrySwitching(true);
                setSelectedEntryId(id);
                setTimeout(() => setIsEntrySwitching(false), 300);
              }}
              getUiReportingStatus={(status, windowEndsAt) =>
                getUiReportingStatus(status, windowEndsAt, mounted)
              }
              assignmentCountByProgrammeId={assignmentCountByProgrammeId}
            />
            {!filteredBoard.length ? (
              <p className="text-xs text-muted-foreground">
                No programmes match filters.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-2 relative overflow-hidden border-border/70 shadow-sm"
          ref={confettiRef}
        >
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selected?.programme?.name || "Select a programme"}</span>
                {selected?.programme?.category?.name ? (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {selected.programme.category.name}
                  </Badge>
                ) : null}
                {session?.isLocked && (
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    Locked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selected?.stage?.name && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {selected.stage.name}
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              "pt-6 space-y-6 transition-opacity duration-300",
              isEntrySwitching ? "opacity-0" : "opacity-100",
            )}
          >
            {isInitialLoading ? (
              <div className="space-y-3">
                <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded-md bg-muted/60" />
                <div className="h-10 w-36 animate-pulse rounded bg-muted" />
              </div>
            ) : !selected ? (
              <div className="py-20 text-center space-y-3">
                <div className="p-3 rounded-full bg-muted w-fit mx-auto">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Choose a programme under{" "}
                  <strong className="text-foreground">Up next</strong> (or
                  switch to{" "}
                  <strong className="text-foreground">Full list</strong>), then
                  run reporting on the right.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                      <Badge
                        variant={
                          selected.programme?.type === "GROUP"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px] uppercase"
                      >
                        {selected.programme?.type}
                      </Badge>
                      {isInProgress ? (
                        <Badge className="gap-1 border-emerald-600/40 bg-emerald-600/15 text-emerald-800 dark:text-emerald-100">
                          <span className="relative inline-flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Live
                        </Badge>
                      ) : isTimedOut ? (
                        <Badge variant="secondary">Timed out</Badge>
                      ) : isClosed ? (
                        <Badge variant="secondary">Finished</Badge>
                      ) : sessionStatus === "RESET" ? (
                        <Badge variant="outline">Stopped</Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}
                      {isInProgress ? (
                        <span className="text-xs text-muted-foreground">
                          {reportingStats ? (
                            <>
                              <span className="font-medium text-foreground tabular-nums">
                                {reportingStats.reported}/{reportingStats.total}
                              </span>
                              <span className="mx-1.5 text-border">·</span>
                              <span className="tabular-nums">
                                {Math.round(reportingStats.percentageComplete)}%
                              </span>
                              <span className="mx-1.5 text-border">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {reportingStats.elapsedMinutes}m
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-foreground tabular-nums">
                                {reportedUnitsCount}/{rosterTableRows.length}
                              </span>
                              <span className="ml-1">present</span>
                            </>
                          )}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isPreStart ? (
                        <Button
                          onClick={onStart}
                          disabled={
                            isPending ||
                            activeAction != null ||
                            session?.isLocked ||
                            assignmentsWithReported.length === 0
                          }
                          className="rounded-lg bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 font-semibold text-white shadow-md shadow-violet-900/20 hover:brightness-110"
                        >
                          {activeAction === "start" ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {isTimedOut || sessionStatus === "RESET"
                                ? "Restarting…"
                                : "Starting…"}
                            </span>
                          ) : isTimedOut || sessionStatus === "RESET" ? (
                            "Restart"
                          ) : (
                            "Start check-in"
                          )}
                        </Button>
                      ) : null}
                      {isInProgress ? (
                        <>
                          <Button
                            className="rounded-lg font-semibold"
                            onClick={onClose}
                            title={
                              reportedUnitsCount === 0
                                ? "Mark at least one participant/team as present before submitting."
                                : !allReportedHaveCodeLetters
                                  ? "Assign a code letter to each present participant (spin per person) before submitting."
                                : undefined
                            }
                            disabled={
                              isPending ||
                              activeAction != null ||
                              !session?.id ||
                              session.isLocked ||
                              !isInProgress ||
                              assignmentsWithReported.length === 0 ||
                              reportedUnitsCount === 0 ||
                              !allReportedHaveCodeLetters
                            }
                          >
                            {activeAction === "close" ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting…
                              </span>
                            ) : (
                              "Submit & notify"
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                aria-label="More reporting actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                disabled={
                                  isPending ||
                                  activeAction === "mark" ||
                                  activeAction === "random-spin" ||
                                  !session?.id ||
                                  session.isLocked ||
                                  !isInProgress ||
                                  assignmentsWithReported.every(
                                    (a) => a.isReported,
                                  )
                                }
                                onClick={() => {
                                  if (!session?.id) return;
                                  setActiveAction("mark");
                                  startTransition(async () => {
                                    const res =
                                      await markProgrammeAssignmentsBulkAction(
                                        festivalId,
                                        session.id,
                                        assignmentsWithReported.map(
                                          (a) => a.id,
                                        ),
                                        true,
                                      );
                                    if (res.success) {
                                      if (confettiRef.current) {
                                        party.confetti(confettiRef.current, {
                                          count: party.variation.range(20, 40),
                                          size: party.variation.range(0.6, 1.0),
                                        });
                                      }
                                      toast.success("All marked present");
                                    } else toast.error("Bulk action failed");
                                    setActiveAction(null);
                                  });
                                }}
                              >
                                Mark all present
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  isPending ||
                                  activeAction === "random-spin" ||
                                  !session?.id ||
                                  session.isLocked ||
                                  !isInProgress ||
                                  reportedUnitsCount === 0
                                }
                                onClick={onRandomSpinAll}
                              >
                                {activeAction === "random-spin"
                                  ? "Random spinning..."
                                  : "Random spin all codes"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={
                                  isPending ||
                                  activeAction === "reset" ||
                                  !session?.id ||
                                  session.isLocked
                                }
                                onClick={onReset}
                              >
                                Stop without codes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  isPending ||
                                  activeAction === "reset-codes" ||
                                  !session?.id ||
                                  session.isLocked ||
                                  !isInProgress ||
                                  !session.programmeCodeLetters?.length
                                }
                                onClick={onResetCodeLetters}
                              >
                                {activeAction === "reset-codes"
                                  ? "Resetting code letters..."
                                  : "Reset all code letters"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : null}
                      {isClosed ? (
                        <Button
                          variant="destructive"
                          onClick={() => setIsReopenConfirmOpen(true)}
                          disabled={
                            isPending || activeAction != null || !session?.id
                          }
                        >
                          Reopen reporting
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isPreStart ? (
                    <p className="text-xs text-muted-foreground">
                      {assignmentsWithReported.length === 0
                        ? "No assignments yet — add students in Pre Event Works first."
                        : `${assignmentsWithReported.length} on roster. Start when you’re ready.`}
                    </p>
                  ) : null}
                  {isClosed ? (
                    <p className="text-xs text-muted-foreground">
                      {selected.programme?.type === "GROUP"
                        ? "One code letter per reported team; notifications sent."
                        : "Codes issued; notifications sent."}
                    </p>
                  ) : null}
                  {isTimedOut ? (
                    <p className="text-xs text-muted-foreground">
                      Window ended — restart to continue.
                    </p>
                  ) : null}
                  {isReset ? (
                    <p className="text-xs text-muted-foreground">
                      Stopped with no codes — restart to try again.
                    </p>
                  ) : null}
                </div>

                {isInProgress && reportingStats ? (
                  <ReportingStats stats={reportingStats} />
                ) : null}

                {selected.programme ? (
                  <div className="space-y-2">
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                      <Users2 className="h-4 w-4 text-muted-foreground" />
                      Roster
                    </h3>
                    <ReportingRosterTable
                      rows={rosterTableRows}
                      isInProgress={isInProgress}
                      isClosed={isClosed}
                      onMark={onMarkRow}
                      onSpin={(row) => {
                        setSpinPendingAssignmentId(row.assignmentId);
                        setSpinAssignRequested(false);
                        setActiveSpinRow(row);
                        setIsSpinWheelOpen(true);
                      }}
                      spinPendingAssignmentId={spinPendingAssignmentId}
                      markingIds={markingIds}
                      getIssuedCodeForRow={getIssuedCodeForRow}
                      programmeType={selected.programme.type}
                    />
                  </div>
                ) : null}

                {isInProgress && selected && session?.id ? (
                  <ReportingQuickAddSection
                    open={scanSectionOpen}
                    onOpenChange={setScanSectionOpen}
                  >
                    <QrScanner
                      variant="embedded"
                      festivalId={festivalId}
                      reportingSessionId={session.id}
                      programmeName={selected.programme?.name || "Programme"}
                      onScanSuccess={() => {
                        router.refresh();
                      }}
                      onScanError={() => {}}
                    />
                  </ReportingQuickAddSection>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CompactHistoryList
        title="Reporting history"
        count={reportingHistoryItems.length}
        emptyText="Reporting history appears after sessions end or close."
        items={reportingHistoryItems}
        onViewItem={setHistoryDetailOpenId}
      />

      {/* Code Letter Spin Wheel Modal */}
      <CodeLetterSpinWheel
        open={isSpinWheelOpen}
        onOpenChange={handleSpinWheelOpenChange}
        targetName={activeSpinRow?.nameColumn || "Participant"}
        participantCount={Math.max(1, reportedUnitsCount)}
        alreadyAssignedCodes={alreadyAssignedCodes}
        onResult={handleSpinResult}
      />

      <AlertDialog
        open={isReopenConfirmOpen}
        onOpenChange={setIsReopenConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen closed reporting?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears reported attendance, code letters, and all marks for
              this programme. Open judge links are invalidated and you must run
              reporting again before judging.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activeAction === "reopen"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onReopen}
              disabled={activeAction === "reopen"}
            >
              {activeAction === "reopen"
                ? "Reopening..."
                : "Reopen and clear data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(historyDetail)}
        onOpenChange={(open) => {
          if (!open) setHistoryDetailOpenId(null);
        }}
      >
        <DialogContent className="max-h-[min(88dvh,720px)] overflow-y-auto p-3 sm:max-w-2xl sm:p-6">
          {historyDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>{historyDetail.programmeName}</DialogTitle>
                <DialogDescription>
                  {historyDetail.stageName} • {historyDetail.startTimeLabel}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Status</p>
                    <p className="text-xs font-semibold">{historyDetail.statusLabel}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Type</p>
                    <p className="text-xs font-semibold">{historyDetail.type}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Category</p>
                    <p className="text-xs font-semibold">{historyDetail.categoryName}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {historyDetail.type === "GROUP" ? "Teams reported" : "Reported"}
                    </p>
                    <p className="text-xs font-semibold">{historyDetail.reportedCount}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {historyDetail.type === "GROUP" ? "Team codes" : "Codes"}
                    </p>
                    <p className="text-xs font-semibold">{historyDetail.codeCount}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Timeline
                  </p>
                  <Accordion type="single" collapsible className="mt-2 rounded-md border border-border/70 bg-background/70 px-2.5">
                    <AccordionItem value="reporting-timeline" className="border-b-0">
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex min-w-0 items-center gap-2 text-left">
                          <span className="truncate text-[11px] font-semibold sm:text-[12px]">
                            Timeline events
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {historyDetail.timeline.length + historyDetail.participantTimeline.length} total
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pt-0">
                        <div className="space-y-2">
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Reporting timeline
                            </p>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {historyDetail.timeline.map((step, index) => (
                                <div
                                  key={`${step.title}-${index}`}
                                  className="rounded-md border border-border/70 bg-linear-to-br from-background via-background to-muted/30 px-2.5 py-2"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/10 text-[9px] font-semibold text-violet-700 dark:text-violet-300">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                                        {step.title}
                                      </p>
                                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                                        {step.at}
                                      </p>
                                      {step.note ? (
                                        <p className="text-[10px] text-muted-foreground/90">
                                          {step.note}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {historyDetail.type === "GROUP"
                                ? "Team reported timeline"
                                : "Participant reported timeline"}
                            </p>
                            {historyDetail.participantTimeline.length ? (
                              <div className="grid gap-1.5 sm:grid-cols-2">
                                {historyDetail.participantTimeline.map((entry, index) => (
                                  <div
                                    key={entry.key}
                                    className="rounded-md border border-border/70 bg-background/70 px-2.5 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                                          {index + 1}. {entry.label}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {entry.chestOrTeam} • {entry.group}
                                        </p>
                                      </div>
                                      <span className="rounded border bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                        {entry.code}
                                      </span>
                                    </div>
                                    <div className="mt-1 grid gap-1 text-[10px] text-muted-foreground">
                                      <p>
                                        Reported:{" "}
                                        {entry.reportedAt
                                          ? formatStoredDateTime(entry.reportedAt, {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                            })
                                          : "—"}
                                      </p>
                                      <p>
                                        Spun/Issued:{" "}
                                        {entry.spunAt
                                          ? formatStoredDateTime(entry.spunAt, {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                            })
                                          : "Pending"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                No reported entries captured for this session.
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
