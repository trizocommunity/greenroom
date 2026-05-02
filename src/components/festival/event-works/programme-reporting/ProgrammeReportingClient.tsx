"use client";

import { BarChart3, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import party from "party-js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CompactHistoryList } from "@/components/dashboard/event-works/CompactHistoryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
import {
  assignCodeLettersWithSpinAction,
  closeProgrammeReportingAction,
  getReportingStatsAction,
  markProgrammeAssignmentsBulkAction,
  markProgrammeParticipantAction,
  resetProgrammeReportingAction,
  startProgrammeReportingAction,
} from "@/features/programmes/actions/programme-reporting.actions";
import { getCodeForStudentFromLetters } from "@/features/programmes/services/programme-reporting-code";
import { CodeLetterSpinWheel } from "./CodeLetterSpinWheel";
import { QrScanner } from "./QrScanner";
import { ReportingBoardList } from "./ReportingBoardList";
import { ReportingRosterTable } from "./ReportingRosterTable";
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [activeAction, setActiveAction] = useState<
    null | "start" | "reset" | "close" | "mark"
  >(null);
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
        mounted,
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
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [board, filterStatus, filterCategoryId, filterStageId, filterType]);

  const reportingHistoryItems = useMemo(() => {
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

  const reportedUnitsCount = useMemo(() => {
    if (!selected?.programme?.type) return 0;
    if (selected.programme.type === "INDIVIDUAL") {
      return assignmentsWithReported.filter((a) => a.isReported).length;
    }
    // GROUP: count unique team keys
    const reportedTeams = new Set<string>();
    for (const a of assignmentsWithReported) {
      if (a.isReported && a.groupId && a.teamNumber != null) {
        reportedTeams.add(`${a.groupId}-${a.teamNumber}`);
      }
    }
    return reportedTeams.size;
  }, [assignmentsWithReported, selected?.programme?.type]);

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

  const session = selected?.reportingSession;
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

    try {
      // Prepare the assignment object
      const assignment = {
        teamNumber:
          activeSpinRow.mode === "groupTeam" ? activeSpinRow.teamCell : null,
        studentId:
          activeSpinRow.mode === "individual" ? activeSpinRow.studentId : null,
        code: code,
      };

      const result = await assignCodeLettersWithSpinAction(
        festivalId,
        session.id,
        [assignment],
      );

      if (result.success) {
        toast.success(`Code ${code} assigned to ${activeSpinRow.nameColumn}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to assign code");
      console.error(error);
    }
  };

  const getIssuedCodeForRow = (row: RosterTableRow): string | null => {
    if (row.mode === "individual") {
      return row.studentId
        ? getCodeForStudentFromLetters(
            session?.programmeCodeLetters ?? [],
            row.studentId,
          )
        : null;
    }
    return (
      row.studentIds
        .map((sid) =>
          sid
            ? getCodeForStudentFromLetters(
                session?.programmeCodeLetters ?? [],
                sid,
              )
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

  const onClose = () => {
    if (!session?.id) return;
    const programmeType = selected?.programme?.type;
    setActiveAction("close");
    startTransition(async () => {
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
            ? "Reporting ended — one code letter per reported team (shared by all members)."
            : "Reporting ended — individual code letters issued to reported students.",
        );
        router.refresh();
      } else toast.error("Failed to submit reporting");
      setActiveAction(null);
    });
  };

  const handleSpinWheelConfirm = async (
    assignments: Array<{
      teamNumber: number | null;
      studentId?: string | null;
      code: string;
    }>,
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
        setIsSpinWheelOpen(false);
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

  const onMarkRow = async (row: RosterTableRow, checked: boolean) => {
    if (!session?.id) return;

    const ids =
      row.mode === "individual" ? [row.assignmentId] : row.assignmentIds;

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
      if (row.mode === "individual") {
        await markProgrammeParticipantAction(
          festivalId,
          session.id,
          row.assignmentId,
          checked,
        );
      } else {
        await markProgrammeAssignmentsBulkAction(
          festivalId,
          session.id,
          row.assignmentIds,
          checked,
        );
      }
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Scheduled Programmes</CardTitle>
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
              getUiReportingStatus={getUiReportingStatus}
            />
            {!filteredBoard.length ? (
              <p className="text-xs text-muted-foreground">
                No programmes match filters.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-2 relative overflow-hidden"
          ref={confettiRef}
        >
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selected?.programme?.name || "Select a programme"}</span>
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
                <p className="text-sm text-muted-foreground">
                  Select a scheduled programme from the board to start
                  reporting.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                      {session?.isLocked && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          Locked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                        <Badge variant="secondary">Closed</Badge>
                      ) : sessionStatus === "RESET" ? (
                        <Badge variant="outline">Closed</Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}
                    </div>
                  </div>

                  {reportingStats && isInProgress && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Reported</span>
                        <span className="font-bold">
                          {reportingStats.reported}
                          <span className="text-muted-foreground font-normal">
                            /{reportingStats.total}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold">
                          {Math.round(reportingStats.percentageComplete)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{reportingStats.elapsedMinutes}m</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isPreStart ? (
                      <Button
                        onClick={onStart}
                        disabled={
                          isPending ||
                          activeAction != null ||
                          session?.isLocked ||
                          assignmentsWithReported.length === 0
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
                          "Restart Reporting"
                        ) : (
                          "Start Reporting"
                        )}
                      </Button>
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
                            "Stop"
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={onClose}
                          disabled={
                            isPending ||
                            activeAction != null ||
                            !session?.id ||
                            session.isLocked ||
                            !isInProgress ||
                            assignmentsWithReported.length === 0
                          }
                        >
                          {activeAction === "close" ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting...
                            </span>
                          ) : (
                            "Submit"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!session?.id) return;
                            setActiveAction("mark");
                            startTransition(async () => {
                              const res =
                                await markProgrammeAssignmentsBulkAction(
                                  festivalId,
                                  session.id,
                                  assignmentsWithReported.map((a) => a.id),
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
                          disabled={
                            isPending ||
                            activeAction != null ||
                            !session?.id ||
                            session.isLocked ||
                            !isInProgress ||
                            assignmentsWithReported.every((a) => a.isReported)
                          }
                          className="ml-auto"
                        >
                          Mark All Present
                        </Button>
                      </>
                    ) : null}
                    {isClosed && (
                      <p className="text-xs text-muted-foreground self-center">
                        {selected.programme?.type === "GROUP"
                          ? "Reporting closed — each reported team shares one code letter."
                          : "Reporting closed — each reported student has a unique code letter."}
                      </p>
                    )}
                    {isTimedOut && (
                      <p className="text-xs text-muted-foreground self-center">
                        Time ended. Use Restart to continue.
                      </p>
                    )}
                    {isReset && (
                      <p className="text-xs text-muted-foreground self-center">
                        Reset. Use Restart to start fresh.
                      </p>
                    )}
                  </div>
                </div>

                {isInProgress && selected && session?.id && (
                  <QrScanner
                    festivalId={festivalId}
                    reportingSessionId={session.id}
                    programmeName={selected.programme?.name || "Programme"}
                    onScanSuccess={(result) => {
                      console.log("QR scan success:", result);
                      router.refresh();
                    }}
                    onScanError={(error) => {
                      console.log("QR scan error:", error);
                    }}
                  />
                )}

                {selected.programme && (
                  <ReportingRosterTable
                    rows={rosterTableRows}
                    isInProgress={isInProgress}
                    isClosed={isClosed}
                    onMark={onMarkRow}
                    onSpin={(row) => {
                      setActiveSpinRow(row);
                      setIsSpinWheelOpen(true);
                    }}
                    markingIds={markingIds}
                    getIssuedCodeForRow={getIssuedCodeForRow}
                    programmeType={selected.programme.type}
                  />
                )}
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

      {/* Code Letter Spin Wheel Modal */}
      <CodeLetterSpinWheel
        open={isSpinWheelOpen}
        onOpenChange={setIsSpinWheelOpen}
        targetName={activeSpinRow?.nameColumn || "Participant"}
        participantCount={rosterTableRows.filter((r) => r.isReported).length}
        alreadyAssignedCodes={alreadyAssignedCodes}
        onResult={handleSpinResult}
      />
    </div>
  );
}
