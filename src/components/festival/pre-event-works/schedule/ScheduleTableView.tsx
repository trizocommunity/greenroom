"use client";

import { format } from "date-fns";
import {
  ArrowRightLeft,
  Clock,
  MapPin,
  Pencil,
  Tag,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/core/utils/cn";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { calculateProgrammeDuration } from "@/features/schedule/utils/programme-duration";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

interface ScheduleTableViewProps {
  entries: EnrichedScheduleEntry[];
  onEdit: (entry: EnrichedScheduleEntry) => void;
  onSwap: (entry: EnrichedScheduleEntry) => void;
  isReadOnly: boolean;
  searchQuery: string;
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

export function ScheduleTableView({
  entries,
  onEdit,
  onSwap,
  isReadOnly,
  searchQuery,
}: ScheduleTableViewProps) {
  const [sortField, setSortField] = useState<"schedule" | "name" | "stage">(
    "schedule",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
    return [...result].sort((a, b) => {
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
  }, [entries, searchQuery, sortField, sortDir]);

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

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground">
        {searchQuery.trim()
          ? "No entries match your search."
          : "No schedule entries yet."}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop / Tablet table ── */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
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
                return (
                  <tr
                    key={entry.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {entry.type === "PROGRAMME"
                          ? (entry.programme?.name ?? "—")
                          : (entry.title ?? "—")}
                      </div>
                      {entry.type === "PROGRAMME" &&
                        entry.programme?.nameSecondary && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {entry.programme.nameSecondary}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">
                        {typeInfo.grade}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeInfo.detail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{countLine}</div>
                      {durationLine && (
                        <div className="text-xs text-muted-foreground">
                          {durationLine}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
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
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.type === "PROGRAMME" && (
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
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onEdit(entry)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
      <div className="md:hidden space-y-3">
        {filtered.map((entry) => {
          const typeInfo = getTypeLabel(entry);
          const participantsLabel = getParticipantsLabel(entry);
          const [countLine, durationLine] = participantsLabel.split("\n");
          return (
            <div
              key={entry.id}
              className="rounded-lg border bg-card p-4 space-y-2.5"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-tight">
                    {entry.type === "PROGRAMME"
                      ? (entry.programme?.name ?? "—")
                      : (entry.title ?? "—")}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSwap(entry)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
    </>
  );
}
