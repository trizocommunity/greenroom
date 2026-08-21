"use client";

import { format } from "date-fns";
import {
  ArrowRightLeft,
  Bell,
  BellOff,
  Clock,
  Flag,
  MapPin,
  Search,
  Tag,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { ProgrammeTimer } from "@/components/festival/event-works/programme-reporting/ReportingBoardList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { calculateProgrammeDuration } from "@/features/schedule/utils/programme-duration";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

interface ScheduleTableViewProps {
  festivalId: string;
  entries: EnrichedScheduleEntry[];
  stages?: Array<{ id: string; name: string }>;
  hideStageFilter?: boolean;
  initialStageId?: string | null;
  onEdit: (entry: EnrichedScheduleEntry) => void;
  onSwap: (entry: EnrichedScheduleEntry) => void;
  onNotify: (entry: EnrichedScheduleEntry) => void;
  onCancelNotify: (entry: EnrichedScheduleEntry) => void;
  onStartReporting: (entry: EnrichedScheduleEntry) => void;
  isReadOnly: boolean;
  searchQuery: string;
  onSearchQueryChange?: (val: string) => void;
}

function safeFormat(d: Date, pattern: string, fallback = "—"): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

function getTypeLabel(entry: EnrichedScheduleEntry): {
  grade: string;
  detail: string;
} {
  if (entry.type === "SESSION") {
    const sessionLabels: Record<string, string> = {
      GENERAL: "General",
      CEREMONY: "Ceremony",
      TALK: "Talk",
      CONCERT: "Concert",
    };
    return {
      grade: "Session",
      detail: sessionLabels[entry.sessionType ?? ""] ?? "General",
    };
  }
  const prog = entry.programme;
  if (!prog) return { grade: "—", detail: "—" };
  const categoryName = prog.category?.name ?? "General";
  const typeLabel = prog.type === "GROUP" ? "Group" : "Individual";
  return { grade: categoryName, detail: typeLabel };
}

function getParticipantsLabel(entry: EnrichedScheduleEntry): string {
  if (entry.type !== "PROGRAMME" || !entry.programme) return "—";
  const prog = entry.programme;
  const dur = calculateProgrammeDuration({
    type: prog.type,
    durationMode: prog.durationMode,
    timePerUnitMinutes: prog.timePerUnitMinutes,
    parallelDurationMinutes: prog.parallelDurationMinutes ?? null,
    unitCount: prog.type === "GROUP" ? entry.teamCount : entry.assignmentCount,
  });
  const countLabel =
    prog.type === "GROUP"
      ? `${entry.teamCount} group${entry.teamCount !== 1 ? "s" : ""}`
      : `${entry.assignmentCount} participant${entry.assignmentCount !== 1 ? "s" : ""}`;
  return `${countLabel}\n${dur.label}`;
}

function getScheduleLabel(entry: EnrichedScheduleEntry): string {
  const start = parseStoredScheduleInstant(entry.startTime);
  const dateStr = safeFormat(start, "MMM d");
  const startStr = safeFormat(start, "h:mm a");
  if (!entry.endTime) return `${dateStr}, ${startStr}`;
  const end = parseStoredScheduleInstant(entry.endTime);
  const endStr = safeFormat(end, "h:mm a");
  return `${dateStr}, ${startStr} → ${endStr}`;
}

export function isEntryInProgress(entry: EnrichedScheduleEntry): boolean {
  if (entry.type !== "PROGRAMME") return false;
  return (
    entry.reportingSession?.status === "IN_PROGRESS" ||
    entry.programme?.status === "REPORTING"
  );
}

export function isEntryCompleted(entry: EnrichedScheduleEntry): boolean {
  if (entry.type !== "PROGRAMME") return false;
  return (
    entry.reportingSession?.status === "CLOSED" ||
    entry.reportingSession?.status === "ENDED" ||
    entry.reportingSession?.status === "TIMED_OUT" ||
    entry.programme?.status === "PENDING_JUDGMENT" ||
    entry.programme?.status === "JUDGING" ||
    entry.programme?.status === "PENDING_PUBLICATION" ||
    entry.programme?.status === "ANNOUNCED"
  );
}

export function ScheduleTableView({
  festivalId: _festivalId,
  entries,
  stages = [],
  hideStageFilter = false,
  initialStageId = null,
  onEdit,
  onSwap,
  onNotify,
  onCancelNotify,
  onStartReporting,
  isReadOnly,
  searchQuery,
  onSearchQueryChange,
}: ScheduleTableViewProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  const [filterDay, setFilterDay] = useState<Date[]>([new Date()]);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStage, setFilterStage] = useState<string>(
    initialStageId ?? "ALL",
  );

  const [sortField, setSortField] = useState<"schedule" | "name" | "stage">(
    "schedule",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const days = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const d = parseStoredScheduleInstant(e.startTime);
      if (!Number.isNaN(d.getTime())) {
        const key = format(d, "yyyy-MM-dd");
        const label = format(d, "MMM d, yyyy");
        map.set(key, label);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label], idx) => ({
        key,
        label: `Day ${idx + 1} (${label})`,
      }));
  }, [entries]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const c = e.programme?.category;
      if (c?.id && c?.name) {
        map.set(c.id, c.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const stageList = useMemo(() => {
    if (stages.length > 0) return stages;
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.stage?.id && e.stage?.name) {
        map.set(e.stage.id, e.stage.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [stages, entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => {
        const name =
          e.type === "PROGRAMME" ? (e.programme?.name ?? "") : (e.title ?? "");
        const secondary =
          e.type === "PROGRAMME" ? (e.programme?.nameSecondary ?? "") : "";
        const stage = e.stage?.name ?? "";
        const cat = e.programme?.category?.name ?? "";
        return (
          name.toLowerCase().includes(q) ||
          secondary.toLowerCase().includes(q) ||
          stage.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q)
        );
      });
    }
    if (filterDay.length > 0) {
      const keys = new Set(filterDay.map((d) => format(d, "yyyy-MM-dd")));
      result = result.filter((e) => {
        const d = parseStoredScheduleInstant(e.startTime);
        return keys.has(format(d, "yyyy-MM-dd"));
      });
    }
    if (filterCategory !== "ALL") {
      result = result.filter(
        (e) => e.programme?.category?.id === filterCategory,
      );
    }
    if (filterStage !== "ALL") {
      result = result.filter(
        (e) => e.stageId === filterStage || e.stage?.id === filterStage,
      );
    }
    return [...result].sort((a, b) => {
      const aDone = isEntryCompleted(a);
      const bDone = isEntryCompleted(b);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;

      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "schedule") {
        return (
          dir *
          (new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        );
      }
      if (sortField === "name") {
        const aName =
          a.type === "PROGRAMME" ? (a.programme?.name ?? "") : (a.title ?? "");
        const bName =
          b.type === "PROGRAMME" ? (b.programme?.name ?? "") : (b.title ?? "");
        return dir * aName.localeCompare(bName);
      }
      if (sortField === "stage") {
        return dir * (a.stage?.name ?? "").localeCompare(b.stage?.name ?? "");
      }
      return 0;
    });
  }, [
    entries,
    searchQuery,
    filterDay,
    filterCategory,
    filterStage,
    sortField,
    sortDir,
  ]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const hasActiveFilters =
    (filterDay.length === 1 ? format(filterDay[0]!, "yyyy-MM-dd") : "ALL") !==
      format(new Date(), "yyyy-MM-dd") ||
    filterCategory !== "ALL" ||
    (filterStage !== "ALL" && filterStage !== initialStageId);

  const filterBar = (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 py-4 md:pt-10 mb-4 w-full">
      {onSearchQueryChange && (
        <div className="relative w-full lg:max-w-sm shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search schedule..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-9 w-full bg-background"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchQueryChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 items-center gap-2 lg:gap-3 w-full lg:w-auto lg:justify-end">
        {days.length > 1 && (
          <DateFilterCombobox
            value={filterDay}
            onChange={setFilterDay}
            availableDates={days}
            placeholder="All days"
            className="h-9 text-xs"
          />
        )}

        {categories.length > 0 && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-auto text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!hideStageFilter && stageList.length > 1 && (
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9 w-auto min-w-[120px] text-xs">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All stages</SelectItem>
              {stageList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        {filterBar}
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground">
          {searchQuery.trim() || hasActiveFilters
            ? "No entries match your search or filters."
            : "No schedule entries yet."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filterBar}
      {/* ── Desktop / Tablet table ── */}
      <div className="hidden lg:block rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort("name")}
                >
                  Competition
                  <SortIndicator field="name" />
                </th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">
                  Participants
                </th>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort("stage")}
                >
                  Stage
                  <SortIndicator field="stage" />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort("schedule")}
                >
                  Schedule
                  <SortIndicator field="schedule" />
                </th>
                {!isReadOnly && (
                  <th className="text-right px-4 py-3 font-medium w-24" />
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const typeInfo = getTypeLabel(entry);
                const participantsLabel = getParticipantsLabel(entry);
                const [countLine, durationLine] = participantsLabel.split("\n");
                const inProgress = isEntryInProgress(entry);
                const completed = isEntryCompleted(entry);
                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      !isReadOnly ? "cursor-pointer" : "",
                      inProgress &&
                        "bg-amber-300/10 hover:bg-amber-300/15 border-l-4 border-l-amber-300",
                      completed &&
                        "bg-muted/40 opacity-70 hover:opacity-100 border-l-4 border-l-emerald-500/60",
                      !inProgress && !completed && "hover:bg-muted/30",
                    )}
                    onClick={() => {
                      if (!isReadOnly) {
                        onEdit(entry);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={cn(
                            "font-medium",
                            completed && "line-through opacity-80",
                          )}
                        >
                          {entry.type === "PROGRAMME"
                            ? (entry.programme?.name ?? "—")
                            : (entry.title ?? "—")}
                        </div>
                        {inProgress &&
                          (() => {
                            const windowEndsAt = entry.reportingSession
                              ?.windowEndsAt
                              ? typeof entry.reportingSession.windowEndsAt ===
                                "string"
                                ? parseInstant(
                                    entry.reportingSession.windowEndsAt,
                                  )
                                : entry.reportingSession.windowEndsAt
                              : null;

                            if (windowEndsAt) {
                              return (
                                <ProgrammeTimer windowEndsAt={windowEndsAt} />
                              );
                            }

                            return (
                              <Badge className="bg-amber-300 hover:bg-amber-400 text-white font-bold text-[9px] px-1.5 h-4 uppercase tracking-wider animate-pulse shrink-0">
                                In Progress
                              </Badge>
                            );
                          })()}
                        {completed && (
                          <Badge
                            variant="outline"
                            className="text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 text-[9px] px-1.5 h-4 uppercase font-semibold shrink-0"
                          >
                            Done
                          </Badge>
                        )}
                      </div>
                      {entry.type === "PROGRAMME" &&
                        entry.programme?.nameSecondary && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {entry.programme.nameSecondary}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-sm">
                        {typeInfo.grade}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeInfo.detail}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">{countLine}</div>
                      {durationLine && (
                        <div className="text-xs text-muted-foreground">
                          {durationLine}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                          entry.stage
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {entry.stage?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {getScheduleLabel(entry)}
                    </td>
                    {!isReadOnly && (
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {entry.type === "PROGRAMME" && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-8 w-8",
                                        entry.callListNotifiedAt
                                          ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                          : "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
                                      )}
                                      onClick={() =>
                                        entry.callListNotifiedAt
                                          ? onCancelNotify(entry)
                                          : onNotify(entry)
                                      }
                                    >
                                      {entry.callListNotifiedAt ? (
                                        <BellOff className="h-4 w-4" />
                                      ) : (
                                        <Bell className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {entry.callListNotifiedAt
                                      ? "Cancel Call List Notification"
                                      : "Notify Call List"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {!completed && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={inProgress}
                                        className={cn(
                                          "h-8 w-8",
                                          inProgress
                                            ? "text-muted-foreground opacity-40 cursor-not-allowed"
                                            : "text-sky-600 hover:text-sky-700 hover:bg-sky-50",
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!inProgress)
                                            onStartReporting(entry);
                                        }}
                                      >
                                        <Flag className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {inProgress
                                        ? "Reporting in progress"
                                        : "Start Reporting"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => onSwap(entry)}
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Switch schedule slot
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile card view ── */}
      <div className="lg:hidden space-y-3">
        {filtered.map((entry) => {
          const typeInfo = getTypeLabel(entry);
          const participantsLabel = getParticipantsLabel(entry);
          const [countLine, durationLine] = participantsLabel.split("\n");
          const inProgress = isEntryInProgress(entry);
          const completed = isEntryCompleted(entry);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: mobile card with nested action buttons (notify/start/swap/edit) — converting the card to <button> would nest interactive elements
            <div
              key={entry.id}
              className={cn(
                "rounded-lg border p-4 space-y-2.5 transition-colors",
                entry.type === "PROGRAMME" && !isReadOnly
                  ? "cursor-pointer"
                  : "",
                inProgress &&
                  "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30",
                completed &&
                  "border-emerald-500/30 bg-muted/40 opacity-75 hover:opacity-100",
                !inProgress &&
                  !completed &&
                  "border-border bg-card hover:border-primary/50",
              )}
              onClick={() => {
                if (!isReadOnly) {
                  onEdit(entry);
                }
              }}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={cn(
                        "font-medium leading-tight",
                        completed && "line-through opacity-80",
                      )}
                    >
                      {entry.type === "PROGRAMME"
                        ? (entry.programme?.name ?? "—")
                        : (entry.title ?? "—")}
                    </div>
                    {inProgress && (
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-bold text-[9px] px-1.5 h-4 uppercase tracking-wider animate-pulse shrink-0">
                        In Progress
                      </Badge>
                    )}
                    {completed && (
                      <Badge
                        variant="outline"
                        className="text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 text-[9px] px-1.5 h-4 uppercase font-semibold shrink-0"
                      >
                        Done
                      </Badge>
                    )}
                  </div>
                  {entry.type === "PROGRAMME" &&
                    entry.programme?.nameSecondary && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.programme.nameSecondary}
                      </div>
                    )}
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {entry.type === "PROGRAMME" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            entry.callListNotifiedAt
                              ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              : "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (entry.callListNotifiedAt) {
                              onCancelNotify(entry);
                            } else {
                              onNotify(entry);
                            }
                          }}
                        >
                          {entry.callListNotifiedAt ? (
                            <BellOff className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                        {!completed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={inProgress}
                            className={cn(
                              "h-8 w-8",
                              inProgress
                                ? "text-muted-foreground opacity-40 cursor-not-allowed"
                                : "text-sky-600 hover:text-sky-700 hover:bg-sky-50",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!inProgress) onStartReporting(entry);
                            }}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSwap(entry);
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {typeInfo.grade}
                  <span className="text-muted-foreground/60">·</span>
                  {typeInfo.detail}
                </span>
                {entry.stage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary font-medium">
                    <MapPin className="h-3 w-3" />
                    {entry.stage.name}
                  </span>
                )}
                {entry.type === "PROGRAMME" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {countLine}
                  </span>
                )}
              </div>

              {/* Schedule + duration */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{getScheduleLabel(entry)}</span>
                {durationLine && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{durationLine}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
