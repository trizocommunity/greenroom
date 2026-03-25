"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCodeForStudentFromLetters } from "@/lib/programme-reporting-code";
import { cn } from "@/lib/utils";
import {
  closeProgrammeReportingAction,
  markProgrammeAssignmentsBulkAction,
  markProgrammeParticipantAction,
  resetProgrammeReportingAction,
  startProgrammeReportingAction,
} from "@/server/actions/programme-reporting.actions";

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

/** User-facing labels: RESET = window stopped without submit; CLOSED = submit & codes issued. */
function reportingSessionStatusLabel(status: string): string {
  switch (status) {
    case "RESET":
      return "Reporting closed";
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
    };

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
  const [optimisticReportedBySession, setOptimisticReportedBySession] =
    useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 7000);
    return () => window.clearInterval(id);
  }, [router]);

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
      const status = item.reportingSession?.status ?? "NOT_STARTED";
      if (filterStatus !== "ALL" && status !== filterStatus) return false;
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
        case "CLOSED":
          return 3;
        default:
          return 999;
      }
    };

    return filtered.sort((a, b) => {
      const aStatus = a.reportingSession?.status ?? "NOT_STARTED";
      const bStatus = b.reportingSession?.status ?? "NOT_STARTED";
      const ra = statusRank(aStatus);
      const rb = statusRank(bStatus);
      if (ra !== rb) return ra - rb;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [board, filterStatus, filterCategoryId, filterStageId, filterType]);

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
  const sessionStatus = session?.status ?? "NOT_STARTED";
  const isPreStart =
    !session || sessionStatus === "NOT_STARTED" || sessionStatus === "RESET";
  const isInProgress = sessionStatus === "IN_PROGRESS";
  const isClosed = sessionStatus === "CLOSED";
  const canEdit = Boolean(session && !session.isLocked && isInProgress);

  const onStart = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await startProgrammeReportingAction(festivalId, selected.id);
      if (res.success) toast.success("Reporting started");
    });
  };

  const onReset = () => {
    if (!session?.id) return;
    startTransition(async () => {
      const res = await resetProgrammeReportingAction(festivalId, session.id);
      if (res.success) toast.success("Reporting closed");
    });
  };

  const onClose = () => {
    if (!session?.id) return;
    const programmeType = selected?.programme?.type;
    startTransition(async () => {
      const res = await closeProgrammeReportingAction(festivalId, session.id);
      if (res.success) {
        toast.success(
          programmeType === "GROUP"
            ? "Reporting ended — one code letter per reported team (shared by all members)."
            : "Reporting ended — individual code letters issued to reported students.",
        );
      }
    });
  };

  const onToggleParticipant = (assignmentId: string, isReported: boolean) => {
    if (!session?.id) return;
    const sessionId = session.id;
    setOptimisticReportedBySession((prev) => {
      const base = new Set(prev[sessionId] ?? []);
      if (isReported) {
        base.delete(assignmentId);
      } else {
        base.add(assignmentId);
      }
      return { ...prev, [sessionId]: base };
    });
    startTransition(async () => {
      const res = await markProgrammeParticipantAction(
        festivalId,
        sessionId,
        assignmentId,
        !isReported,
      );
      if (res.success) {
        router.refresh();
      } else {
        setOptimisticReportedBySession((prev) => {
          const base = new Set(prev[sessionId] ?? []);
          if (isReported) base.add(assignmentId);
          else base.delete(assignmentId);
          return { ...prev, [sessionId]: base };
        });
      }
    });
  };

  const onToggleTeam = (
    assignmentIds: string[],
    currentlyAllReported: boolean,
  ) => {
    if (!session?.id || assignmentIds.length === 0) return;
    const sessionId = session.id;
    const nextReported = !currentlyAllReported;
    setOptimisticReportedBySession((prev) => {
      const base = new Set(prev[sessionId] ?? []);
      for (const id of assignmentIds) {
        if (nextReported) base.add(id);
        else base.delete(id);
      }
      return { ...prev, [sessionId]: base };
    });
    startTransition(async () => {
      const res = await markProgrammeAssignmentsBulkAction(
        festivalId,
        sessionId,
        assignmentIds,
        nextReported,
      );
      if (res.success) {
        router.refresh();
      } else {
        setOptimisticReportedBySession((prev) => {
          const base = new Set(prev[sessionId] ?? []);
          for (const id of assignmentIds) {
            if (currentlyAllReported) base.add(id);
            else base.delete(id);
          }
          return { ...prev, [sessionId]: base };
        });
      }
    });
  };

  return (
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
                setFilterType(e.target.value as "ALL" | "INDIVIDUAL" | "GROUP")
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

          {filteredBoard.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedEntryId(item.id)}
              className={`w-full rounded-lg border p-3 text-left ${
                selectedEntryId === item.id ? "border-primary bg-primary/5" : ""
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
                <Badge variant="outline" className="gap-1">
                  {item.reportingSession?.status === "IN_PROGRESS" ? (
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  ) : null}
                  {reportingSessionStatusLabel(
                    item.reportingSession?.status ?? "NOT_STARTED",
                  )}
                </Badge>
              </div>
            </button>
          ))}
          {!filteredBoard.length ? (
            <p className="text-xs text-muted-foreground">
              No programmes match filters.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Live Reporting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a scheduled programme.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{selected.programme?.name}</Badge>
                <Badge variant="outline">
                  {selected.stage?.name ?? "No stage"}
                </Badge>
                <Badge variant="outline">
                  {selected.programme?.type ?? "—"}
                </Badge>
                {isInProgress ? (
                  <Badge className="gap-1 border-emerald-600/40 bg-emerald-600/15 text-emerald-800 dark:text-emerald-100">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live now
                  </Badge>
                ) : isClosed ? (
                  <Badge variant="secondary">Reporting ended</Badge>
                ) : sessionStatus === "RESET" ? (
                  <Badge variant="outline">Reporting closed</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
                {isInProgress && session?.windowEndsAt ? (
                  <ReportingEndsInCountdown endsAt={session.windowEndsAt} />
                ) : null}
              </div>

              {groupAssignmentMatrix.length > 0 ? (
                <div className="rounded-md border border-border/70 bg-muted/10 px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight">
                    <span className="shrink-0 text-muted-foreground">
                      Coverage
                      {selected.programme?.type === "GROUP" ? " · teams" : ""}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-foreground">
                        {matrixTotals.assigned}
                      </span>{" "}
                      <span className="text-muted-foreground">assigned</span>
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {matrixTotals.reported}
                      </span>{" "}
                      <span className="text-muted-foreground">marked</span>
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          matrixTotals.assigned - matrixTotals.reported > 0
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-muted-foreground",
                        )}
                      >
                        {matrixTotals.assigned - matrixTotals.reported}
                      </span>{" "}
                      <span className="text-muted-foreground">left</span>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {groupAssignmentMatrix.map((row) => {
                      const pending = row.assigned - row.reported;
                      const done =
                        row.assigned > 0 && pending === 0 && row.reported > 0;
                      const label =
                        selected.programme?.type === "GROUP"
                          ? `${row.groupName} · T${row.teamDisplay}`
                          : row.groupName;
                      return (
                        <span
                          key={row.key}
                          title={`${label}: ${row.reported} reported of ${row.assigned} assigned`}
                          className={cn(
                            "inline-flex max-w-44 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] tabular-nums",
                            done
                              ? "border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-500/10"
                              : "border-border/60 bg-background/80",
                          )}
                        >
                          <span className="min-w-0 truncate text-muted-foreground">
                            {label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              done
                                ? "text-emerald-800 dark:text-emerald-100"
                                : "text-foreground",
                            )}
                          >
                            {row.reported}/{row.assigned}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : selected.programme ? (
                <p className="text-xs text-muted-foreground">
                  No assignments for this programme.
                </p>
              ) : null}

              {isPreStart ? (
                <p className="text-xs text-muted-foreground">
                  Select Start to open the attendance window and mark students.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {isPreStart ? (
                  <Button
                    onClick={onStart}
                    disabled={isPending || session?.isLocked}
                  >
                    Start
                  </Button>
                ) : null}
                {isInProgress ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={onReset}
                      disabled={isPending || !session?.id || session.isLocked}
                    >
                      Stop / Reset
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      disabled={
                        isPending ||
                        !session?.id ||
                        session.isLocked ||
                        !isInProgress
                      }
                    >
                      Submit & Close
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
              </div>

              {!isPreStart ? (
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                    <div className="col-span-4">
                      {selected.programme?.type === "GROUP"
                        ? "Team / members"
                        : "Student"}
                    </div>
                    <div className="col-span-2">Group</div>
                    <div className="col-span-2">Team</div>
                    <div className="col-span-2">Reported</div>
                    <div className="col-span-2">Code letter</div>
                  </div>
                  {rosterTableRows.map((row) => {
                    const issuedCode =
                      row.mode === "individual"
                        ? row.studentId
                          ? getCodeForStudentFromLetters(
                              session?.codeLetters ?? [],
                              row.studentId,
                            )
                          : null
                        : (row.studentIds
                            .map((sid) =>
                              sid
                                ? getCodeForStudentFromLetters(
                                    session?.codeLetters ?? [],
                                    sid,
                                  )
                                : null,
                            )
                            .find((c) => c != null) ?? null);
                    const showCode = isClosed && issuedCode && row.isReported;
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-12 items-center px-3 py-2 text-sm"
                      >
                        <div className="col-span-4 wrap-break-word pr-2">
                          {row.nameColumn}
                        </div>
                        <div className="col-span-2 truncate">
                          {row.groupName ?? "—"}
                        </div>
                        <div className="col-span-2">{row.teamCell}</div>
                        <div className="col-span-2">
                          <input
                            type="checkbox"
                            checked={row.isReported}
                            title={
                              row.mode === "groupTeam"
                                ? "Marks every member of this team together"
                                : undefined
                            }
                            onChange={() =>
                              row.mode === "individual"
                                ? onToggleParticipant(
                                    row.assignmentId,
                                    row.isReported,
                                  )
                                : onToggleTeam(
                                    row.assignmentIds,
                                    row.isReported,
                                  )
                            }
                            disabled={isPending || !canEdit}
                          />
                        </div>
                        <div className="col-span-2 font-mono text-xs">
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
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
