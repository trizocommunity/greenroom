"use client";

import { BarChart3, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CompactHistoryList } from "@/components/dashboard/event-works/CompactHistoryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { getCodeForStudentFromLetters } from "@/lib/programme-reporting-code";
import {
  assignCodeLettersWithSpinAction,
  closeProgrammeReportingAction,
  getReportingStatsAction,
  resetProgrammeReportingAction,
  startProgrammeReportingAction,
} from "@/server/actions/programme-reporting.actions";
import { QrScanner } from "./QrScanner";
import { CodeLetterSpinWheel } from "./CodeLetterSpinWheel";

export type ReportingBoardItem = {
  id: string;
  startTime: Date;
  stage: { id: string; name: string } | null;
  programme: {
    id: string;
    name: string;
    type: "INDIVIDUAL" | "GROUP";
    category: { id: string; name: string } | null;
  } | null;
  reportingSession: {
    id: string;
    status: string;
    windowEndsAt: Date | null;
    isLocked: boolean;
    reportedParticipants: Array<{ assignmentId: string }>;
    codeLetters: Array<{
      code: string;
      recipients: Array<{ studentId: string }>;
    }>;
  } | null;
};

export type ProgrammeReportingAssignmentRow = {
  id: string;
  programmeId: string;
  studentId: string | null;
  studentName: string | null;
  groupId: string | null;
  groupName: string | null;
  teamNumber: number | null;
};

export type ReportedParticipantInfo = {
  assignmentId: string;
  reportingSessionId: string;
  reportedBy: string | null;
  reportedAt: Date;
};

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
): string {
  if (
    status === "IN_PROGRESS" &&
    windowEndsAt != null &&
    windowEndsAt.getTime() <= Date.now()
  ) {
    return "TIMED_OUT";
  }
  return status ?? "NOT_STARTED";
}

type AssignmentWithReported = ProgrammeReportingAssignmentRow & {
  isReported: boolean;
};

type RosterTableRow =
  | {
      key: string;
      mode: "individual";
      assignmentId: string;
      studentId: string | null;
      nameColumn: string;
      groupName: string | null;
      teamCell: string | number;
      isReported: boolean;
      reportedBy?: string | null;
    }
  | {
      key: string;
      mode: "groupTeam";
      assignmentIds: string[];
      studentIds: (string | null)[];
      nameColumn: string;
      groupName: string | null;
      teamCell: number;
      isReported: boolean;
      reportedBy?: string | null;
    };

export function ProgrammeReportingClient({
  festivalId,
  board,
  assignments,
  festivalStages,
  reportedParticipants = [],
}: {
  festivalId: string;
  board: ReportingBoardItem[];
  assignments: ProgrammeReportingAssignmentRow[];
  /** All festival stages (filter dropdown); board alone only lists stages that appear on slots. */
  festivalStages: Array<{ id: string; name: string }>;
  reportedParticipants?: ReportedParticipantInfo[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterCategoryId, setFilterCategoryId] = useState<string>("ALL");
  const [filterStageId, setFilterStageId] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "INDIVIDUAL" | "GROUP">(
    "ALL",
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isEntrySwitching, setIsEntrySwitching] = useState(false);
  const [activeAction, setActiveAction] = useState<
    null | "start" | "reset" | "close" | "mark"
  >(null);
  const [optimisticReportedBySession, setOptimisticReportedBySession] =
    useState<Record<string, Set<string>>>({});
  const [lastRefreshAt, setLastRefreshAt] = useState(0);
  const [reportingStats, setReportingStats] = useState<{
    total: number;
    reported: number;
    remaining: number;
    percentageComplete: number;
    elapsedMinutes: number;
    estimatedRemainingMinutes: number | null;
    estimatedEnd: Date | null;
  } | null>(null);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const [reportedTeams, setReportedTeams] = useState<
    Map<string, { teamNumber: number; members: number }>
  >(new Map());
  const [lastScannedTeam, setLastScannedTeam] = useState<string | null>(null);

  const reportingRoomKeys = useMemo(() => {
    const base = [`festival:${festivalId}:all`];
    const sessionId = selectedEntryId
      ? board.find((entry) => entry.id === selectedEntryId)?.reportingSession
          ?.id
      : null;
    if (sessionId) {
      base.push(`festival:${festivalId}:reporting:${sessionId}`);
    }
    return base;
  }, [board, festivalId, selectedEntryId]);

  useRealtimeChannel({
    roomKeys: reportingRoomKeys,
    enabled: true,
    onEvent: (event) => {
      const eventName =
        typeof event.eventName === "string"
          ? event.eventName
          : typeof event.type === "string"
            ? event.type
            : "";
      if (!eventName.includes("reporting")) return;
      const now = Date.now();
      if (now - lastRefreshAt < 1500) return;
      setLastRefreshAt(now);
      router.refresh();
    },
  });

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
    const filtered = board.filter((item) => {
      const status = getUiReportingStatus(
        item.reportingSession?.status,
        item.reportingSession?.windowEndsAt ?? null,
      );
      const matchesStatus =
        filterStatus === "ALL" ||
        status === filterStatus ||
        (filterStatus === "RESET" && status === "TIMED_OUT");
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

    // Priority for "Scheduled Programmes" list (order 4 → 1 → 2 → 3):
    // Not started (4) -> In progress (1) -> Reporting closed (2) -> Reporting ended (3).
    const statusRank = (s: string): number => {
      switch (s) {
        case "IN_PROGRESS":
          return 0;
        case "NOT_STARTED":
          return 1;
        case "RESET":
          return 2;
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
      );
      const bStatus = getUiReportingStatus(
        b.reportingSession?.status,
        b.reportingSession?.windowEndsAt ?? null,
      );
      const ra = statusRank(aStatus);
      const rb = statusRank(bStatus);
      if (ra !== rb) return ra - rb;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [board, filterStatus, filterCategoryId, filterStageId, filterType]);

  const reportingHistoryItems = useMemo(() => {
    return board
      .map((item) => {
        const status = getUiReportingStatus(
          item.reportingSession?.status,
          item.reportingSession?.windowEndsAt ?? null,
        );
        return {
          item,
          status,
        };
      })
      .filter(({ status }) => ["CLOSED", "RESET", "TIMED_OUT"].includes(status))
      .sort(
        (a, b) =>
          new Date(b.item.startTime).getTime() -
          new Date(a.item.startTime).getTime(),
      )
      .map(({ item, status }) => ({
        id: item.id,
        title: item.programme?.name ?? "Unknown programme",
        badge: reportingSessionStatusLabel(status),
        metaPrimary: `${item.stage?.name ?? "No stage"} • ${new Date(item.startTime).toLocaleTimeString()}`,
        metaSecondary: `${item.programme?.category?.name ?? "No category"} • ${item.programme?.type ?? "—"}`,
      }));
  }, [board]);

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
      selected.reportingSession.reportedParticipants.map((r) => r.assignmentId),
    );
    setOptimisticReportedBySession((prev) => ({ ...prev, [sid]: next }));
  }, [selected?.reportingSession]);

  const assignmentsWithReported = useMemo((): AssignmentWithReported[] => {
    if (!selected?.programme?.id) return [];
    const programmeId = selected.programme.id;
    const serverReported = new Set(
      selected.reportingSession?.reportedParticipants.map(
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

    const teamMap = new Map<string, AssignmentWithReported[]>();
    for (const a of rows) {
      const gid = a.groupId ?? "";
      const tn = a.teamNumber ?? 1;
      const key = `${gid}\0${tn}`;
      const list = teamMap.get(key) ?? [];
      list.push(a);
      teamMap.set(key, list);
    }

    const clusters = Array.from(teamMap.entries()).map(([key, members]) => {
      const sortedMembers = [...members].sort((m1, m2) =>
        (m1.studentName ?? "").localeCompare(m2.studentName ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      const first = sortedMembers[0]!;
      const tn = first.teamNumber ?? 1;
      const names = sortedMembers.map((m) => m.studentName ?? "—").join(", ");
      return {
        key,
        mode: "groupTeam" as const,
        assignmentIds: sortedMembers.map((m) => m.id),
        studentIds: sortedMembers.map((m) => m.studentId),
        nameColumn: `Team ${tn} · ${names}`,
        groupName: first.groupName,
        teamCell: tn,
        isReported: sortedMembers.every((m) => m.isReported),
      };
    });

    clusters.sort((A, B) => {
      const ga = (A.groupName ?? "").localeCompare(
        B.groupName ?? "",
        undefined,
        {
          sensitivity: "base",
        },
      );
      if (ga !== 0) return ga;
      return A.teamCell - B.teamCell;
    });

    return clusters;
  }, [assignmentsWithReported, selected?.programme]);

  type GroupMatrixRow = {
    key: string;
    groupName: string;
    teamDisplay: string;
    teamSort: number;
    assigned: number;
    reported: number;
  };

  const groupAssignmentMatrix = useMemo((): GroupMatrixRow[] => {
    if (!assignmentsWithReported.length || !selected?.programme) return [];
    const isGroupProgramme = selected.programme.type === "GROUP";
    const agg = new Map<string, GroupMatrixRow>();

    for (const r of assignmentsWithReported) {
      const gid = r.groupId ?? "__unassigned__";
      const gname = r.groupName ?? "—";
      const teamNum = isGroupProgramme ? (r.teamNumber ?? 1) : null;
      const key = isGroupProgramme ? `${gid}\0${teamNum}` : gid;
      const teamDisplay = isGroupProgramme ? String(teamNum ?? 1) : "—";
      const teamSort = isGroupProgramme ? (teamNum ?? 1) : 0;

      const cur = agg.get(key);
      if (!cur) {
        agg.set(key, {
          key,
          groupName: gname,
          teamDisplay,
          teamSort,
          assigned: 1,
          reported: r.isReported ? 1 : 0,
        });
      } else {
        cur.assigned += 1;
        if (r.isReported) cur.reported += 1;
      }
    }

    return Array.from(agg.values()).sort((a, b) => {
      const g = a.groupName.localeCompare(b.groupName, undefined, {
        sensitivity: "base",
      });
      if (g !== 0) return g;
      return a.teamSort - b.teamSort;
    });
  }, [assignmentsWithReported, selected?.programme]);

  const matrixTotals = useMemo(() => {
    return groupAssignmentMatrix.reduce(
      (acc, r) => ({
        assigned: acc.assigned + r.assigned,
        reported: acc.reported + r.reported,
      }),
      { assigned: 0, reported: 0 },
    );
  }, [groupAssignmentMatrix]);

  const session = selected?.reportingSession;
  const sessionStatus = getUiReportingStatus(
    session?.status,
    session?.windowEndsAt ?? null,
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
  }, [session?.id, sessionStatus, festivalId, lastRefreshAt]);
  const canEdit = Boolean(
    session && !session.isLocked && isInProgress && !isTimedOut,
  );
  const hasAssignmentsForSelected = assignmentsWithReported.length > 0;

  const getIssuedCodeForRow = (row: RosterTableRow): string | null => {
    if (row.mode === "individual") {
      return row.studentId
        ? getCodeForStudentFromLetters(
            session?.codeLetters ?? [],
            row.studentId,
          )
        : null;
    }
    return (
      row.studentIds
        .map((sid) =>
          sid
            ? getCodeForStudentFromLetters(session?.codeLetters ?? [], sid)
            : null,
        )
        .find((c) => c != null) ?? null
    );
  };

  const onStart = () => {
    if (!selected) return;
    setActiveAction("start");
    startTransition(async () => {
      const res = await startProgrammeReportingAction(festivalId, selected.id);
      if (res.success) toast.success("Reporting started");
      else toast.error("Failed to start reporting");
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
      } else {
        toast.error("Failed to reset reporting");
      }
      setActiveAction(null);
    });
  };

  const onClose = () => {
    if (!session?.id) return;
    const programmeType = selected?.programme?.type;
    setActiveAction("close");
    startTransition(async () => {
      const res = await closeProgrammeReportingAction(festivalId, session.id);
      if (res.success) {
        toast.success(
          programmeType === "GROUP"
            ? "Reporting ended — one code letter per reported team (shared by all members)."
            : "Reporting ended — individual code letters issued to reported students.",
        );
      } else {
        toast.error("Failed to submit reporting");
      }
      setActiveAction(null);
    });
  };

  const handleSpinWheelConfirm = async (
    assignments: Array<{ teamNumber: number; code: string }>,
  ) => {
    if (!session?.id) return;

    try {
      toast.info("Assigning code letters...");
      const result = await assignCodeLettersWithSpinAction(
        festivalId,
        session.id,
        assignments,
      );

      if (result.success) {
        toast.success(
          `Successfully assigned ${assignments.length} code letters!`,
        );
        setSpinWheelOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to assign code letters");
      }
    } catch (error) {
      console.error("Failed to assign codes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to assign codes",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Scheduled Programmes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
              >
                <option value="ALL">All category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={filterStageId}
                onChange={(e) => setFilterStageId(e.target.value)}
              >
                <option value="ALL">All stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={filterType}
                onChange={(e) =>
                  setFilterType(
                    e.target.value as "ALL" | "INDIVIDUAL" | "GROUP",
                  )
                }
              >
                <option value="ALL">All type</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="GROUP">Group</option>
              </select>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All status</option>
                <option value="NOT_STARTED">Not started</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESET">Reporting closed</option>
                <option value="CLOSED">Reporting ended</option>
              </select>
            </div>

            <div className="max-h-[54vh] space-y-2 overflow-y-auto pr-1">
              {filteredBoard.map((item) =>
                (() => {
                  const uiStatus = getUiReportingStatus(
                    item.reportingSession?.status,
                    item.reportingSession?.windowEndsAt ?? null,
                  );
                  const canRestart =
                    uiStatus === "TIMED_OUT" || uiStatus === "RESET";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntryId(item.id);
                        setIsEntrySwitching(true);
                        window.setTimeout(
                          () => setIsEntrySwitching(false),
                          220,
                        );
                      }}
                      className={`w-full rounded-lg border p-3 text-left ${
                        selectedEntryId === item.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="font-medium">
                        {item.programme?.name ?? "Unknown programme"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.stage?.name ?? "No stage"} ·{" "}
                        {new Date(item.startTime).toLocaleTimeString()}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {item.programme?.category?.name ?? "No category"} ·{" "}
                        {item.programme?.type ?? "—"}
                      </div>
                      <div className="mt-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="gap-1">
                            {uiStatus === "IN_PROGRESS" ? (
                              <span className="relative inline-flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                              </span>
                            ) : null}
                            {reportingSessionStatusLabel(uiStatus)}
                          </Badge>
                          {canRestart ? (
                            <Badge className="border-amber-600/40 bg-amber-500/15 text-amber-800 dark:text-amber-100">
                              Can restart
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })(),
              )}
            </div>
            {!filteredBoard.length ? (
              <p className="text-xs text-muted-foreground">
                No programmes match filters.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-between">
              <h3>Live Reporting</h3>
              <p className="truncate text-sm font-semibold">
                {selected?.programme?.name ?? "Programme"}
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
            {isInitialLoading ? (
              <div className="space-y-3">
                <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded-md bg-muted/60" />
                <div className="h-10 w-36 animate-pulse rounded bg-muted" />
              </div>
            ) : !selected ? (
              <p className="text-sm text-muted-foreground">
                Select a scheduled programme.
              </p>
            ) : (
              <>
                <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {groupAssignmentMatrix.length > 0 ? (
                      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3">
                        <div className="rounded-md border flex items-center gap-2 bg-muted/10 justify-between px-2.5 py-1 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            Assigned
                          </p>
                          <p className="text-sm font-semibold tabular-nums">
                            {matrixTotals.assigned}
                          </p>
                        </div>
                        <div className="rounded-md border bg-emerald-500/10 px-2.5 py-1 justify-between flex items-center gap-2 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            Marked
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                            {matrixTotals.reported}
                          </p>
                        </div>
                      </div>
                    ) : selected.programme ? (
                      <p className="text-sm text-amber-700 dark:text-amber-300 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        Assignments have not been completed.
                      </p>
                    ) : null}
                    <div className="flex lg:flex-wrap justify-between items-center gap-2">
                      {isInProgress ? (
                        <Badge className="gap-1 border-emerald-600/40 bg-emerald-600/15 text-emerald-800 dark:text-emerald-100">
                          <span className="relative inline-flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Live now
                        </Badge>
                      ) : isTimedOut ? (
                        <Badge variant="secondary">Reporting ended</Badge>
                      ) : isClosed ? (
                        <Badge variant="secondary">Reporting ended</Badge>
                      ) : sessionStatus === "RESET" ? (
                        <Badge variant="outline">Reporting closed</Badge>
                      ) : (
                        <Badge variant="outline">Not started</Badge>
                      )}
                      {/* Estimated time display - informational only, no hard limit */}
                      {isInProgress && reportingStats && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              Started {reportingStats.elapsedMinutes}m ago
                            </span>
                          </div>
                          {reportingStats.estimatedRemainingMinutes && (
                            <div className="flex items-center gap-1.5 text-primary">
                              <BarChart3 className="h-3.5 w-3.5" />
                              <span>
                                Est. ~{reportingStats.estimatedRemainingMinutes}
                                m
                                {reportingStats.estimatedEnd && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    (
                                    {reportingStats.estimatedEnd.toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                    )
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code Scanner Panel - Only show when session is IN_PROGRESS */}
                {isInProgress && selected && session?.id && (
                  <div className="mt-6">
                    <QrScanner
                      festivalId={festivalId}
                      reportingSessionId={session.id}
                      programmeName={selected.programme?.name || "Programme"}
                      onScanSuccess={(result) => {
                        console.log("QR scan success:", result);
                        // Refresh the page to show updated assignment status
                        router.refresh();
                      }}
                      onScanError={(error) => {
                        console.log("QR scan error:", error);
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 w-fit">
                  {isPreStart ? (
                    <div className="w-full flex justify-center pt-5">
                      <Button
                        onClick={onStart}
                        disabled={
                          isPending ||
                          activeAction != null ||
                          session?.isLocked ||
                          !hasAssignmentsForSelected
                        }
                        className="min-w-44 rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-8 py-5 text-base font-semibold text-white shadow-lg shadow-violet-700/30 transition-all hover:brightness-110"
                      >
                        {activeAction === "start" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isTimedOut || sessionStatus === "RESET"
                              ? "Restarting..."
                              : "Starting..."}
                          </span>
                        ) : isTimedOut || sessionStatus === "RESET" ? (
                          "Restart"
                        ) : (
                          "Start"
                        )}
                      </Button>
                    </div>
                  ) : null}
                  {isInProgress ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={onReset}
                        disabled={
                          isPending ||
                          activeAction != null ||
                          !session?.id ||
                          session.isLocked
                        }
                      >
                        {activeAction === "reset" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Resetting...
                          </span>
                        ) : (
                          "Stop / Reset"
                        )}
                      </Button>
                      {/* Assign Codes button for GROUP programmes */}
                      {selected.programme?.type === "GROUP" &&
                        reportingStats &&
                        reportingStats.reported > 0 &&
                        session && (
                          <Button
                            variant="default"
                            onClick={() => setSpinWheelOpen(true)}
                            disabled={
                              isPending ||
                              activeAction != null ||
                              session.isLocked
                            }
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                          >
                            🎰 Assign Codes ({reportingStats.reported} teams)
                          </Button>
                        )}
                      <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={
                          isPending ||
                          activeAction != null ||
                          !session?.id ||
                          session.isLocked ||
                          !isInProgress ||
                          !hasAssignmentsForSelected
                        }
                      >
                        {activeAction === "close" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          "Submit & Start"
                        )}
                      </Button>
                    </>
                  ) : null}
                  {isClosed ? (
                    <p className="text-xs text-muted-foreground self-center">
                      {selected.programme?.type === "GROUP"
                        ? "Reporting ended. Session locked — each reported team shares one code letter (listed once per row)."
                        : "Reporting ended. Session locked — each reported student has a unique code letter in the table."}
                    </p>
                  ) : null}
                  {isTimedOut ? (
                    <p className="text-xs text-muted-foreground self-center">
                      Reporting time ended. Reported participants are saved. Use
                      Restart to continue reporting.
                    </p>
                  ) : null}
                  {isReset ? (
                    <p className="text-xs text-muted-foreground self-center">
                      Programme has been reset. All reporting data cleared. Use
                      Restart to start fresh reporting.
                    </p>
                  ) : null}
                </div>

                {!isPreStart ? (
                  <div className="rounded-md border">
                    {/* Desktop roster (column layout) */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-10 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                        <div className="col-span-5">
                          {selected.programme?.type === "GROUP"
                            ? "Team / members"
                            : "Student"}
                        </div>
                        <div className="col-span-2">Group</div>
                        <div className="col-span-3">Code letter</div>
                      </div>
                      {rosterTableRows.map((row) => {
                        const issuedCode = getIssuedCodeForRow(row);
                        const showCode =
                          isClosed && issuedCode && row.isReported;
                        return (
                          <div
                            key={row.key}
                            className="grid grid-cols-10 items-center px-3 py-2 text-sm"
                          >
                            <div className="col-span-5 wrap-break-word pr-2">
                              {row.nameColumn}
                            </div>
                            <div className="col-span-2 truncate">
                              {row.groupName ?? "—"}
                            </div>
                            <div className="col-span-3 font-mono text-xs">
                              {showCode ? (
                                <span className="rounded border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-blue-800 dark:text-blue-200">
                                  {issuedCode}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile roster (simple card/list) */}
                    <div className="md:hidden space-y-2 p-2">
                      {rosterTableRows.map((row) => {
                        const issuedCode = getIssuedCodeForRow(row);
                        const showCode =
                          isClosed && issuedCode && row.isReported;
                        const title =
                          row.mode === "groupTeam"
                            ? `Team ${row.teamCell}`
                            : row.nameColumn;
                        const subtitle =
                          row.mode === "groupTeam"
                            ? `${row.groupName ?? "—"} · Team ${row.teamCell}`
                            : (row.groupName ?? "—");
                        return (
                          <div
                            key={row.key}
                            className="rounded-lg border bg-background px-3 py-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                  {title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {subtitle}
                                </div>
                              </div>
                            </div>

                            {isClosed ? (
                              <div className="mt-2 flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  {row.isReported ? "Reported" : "Not reported"}
                                </div>
                                <div className="font-mono text-xs">
                                  {showCode ? (
                                    <span className="rounded border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-blue-800 dark:text-blue-200">
                                      {issuedCode}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
        maxHeightClass="max-h-[30vh]"
      />

      {/* Code Letter Spin Wheel Modal - Only for GROUP programmes */}
      {session && selected.programme?.type === "GROUP" && reportingStats && (
        <CodeLetterSpinWheel
          open={spinWheelOpen}
          onOpenChange={setSpinWheelOpen}
          teams={
            // Create team list based on reported count
            // Each "team" represents one unit that needs a code
            Array.from({ length: reportingStats.reported }, (_, i) => ({
              teamNumber: i + 1,
              members: Math.round(
                (reportingStats.total > 0
                  ? (session.reportedParticipants?.length || 0) /
                    reportingStats.total
                  : 1) * 10
              ) / 10, // Approximate members per team
            }))
          }
          onConfirm={handleSpinWheelConfirm}
        />
      )}
    </div>
  );
}
