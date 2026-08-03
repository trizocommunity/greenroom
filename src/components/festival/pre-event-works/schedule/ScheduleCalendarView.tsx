"use client";

import { addMinutes, differenceInMinutes, format, parseISO } from "date-fns";
import {
  AlertCircle,
  Info,
  Tag,
  MapPin,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { useMemo, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/core/utils/cn";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

type StageOption = { id: string; name: string; description?: string | null };

export type CalendarGroupBy = "date" | "stage";

interface ScheduleCalendarViewProps {
  entries: EnrichedScheduleEntry[];
  stages: StageOption[];
  activeDayKey: string | null;
  onEntryClick: (entry: EnrichedScheduleEntry) => void;
  searchQuery: string;
  groupBy: CalendarGroupBy;
  sortedDays: string[];
  timelineStart?: string;
  timelineEnd?: string;
}

const TIME_SLOT_MINUTES = 60;
const ROW_HEIGHT = 120;
const HEADER_COL_WIDTH = 200;

const CATEGORY_PALETTE = [
  "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-100",
  "bg-sky-100 border-sky-400 text-sky-900 dark:bg-sky-900/40 dark:border-sky-600 dark:text-sky-100",
  "bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-100",
  "bg-violet-100 border-violet-400 text-violet-900 dark:bg-violet-900/40 dark:border-violet-600 dark:text-violet-100",
  "bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-900/40 dark:border-rose-600 dark:text-rose-100",
  "bg-orange-100 border-orange-400 text-orange-900 dark:bg-orange-900/40 dark:border-orange-600 dark:text-orange-100",
  "bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-900/40 dark:border-teal-600 dark:text-teal-100",
  "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-600 dark:text-fuchsia-100",
  "bg-lime-100 border-lime-400 text-lime-900 dark:bg-lime-900/40 dark:border-lime-600 dark:text-lime-100",
  "bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-900/40 dark:border-cyan-600 dark:text-cyan-100",
];

const SESSION_COLOR =
  "bg-gray-100 border-gray-400 text-gray-800 dark:bg-gray-800/50 dark:border-gray-500 dark:text-gray-200";

function buildCategoryColorMap(
  entries: EnrichedScheduleEntry[],
): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const e of entries) {
    const cat = e.programme?.category?.name;
    if (cat && !map.has(cat)) {
      map.set(cat, CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]);
      idx++;
    }
  }
  return map;
}

function safeFormat(d: Date, pattern: string, fallback = "—"): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

function getEntryLabel(entry: EnrichedScheduleEntry): string {
  if (entry.type === "PROGRAMME" && entry.programme)
    return entry.programme.name;
  if (entry.type === "SESSION") return entry.title || "—";
  return "—";
}

function hasConflict(
  entry: EnrichedScheduleEntry,
  allEntries: EnrichedScheduleEntry[],
): boolean {
  if (!entry.stageId) return false;
  const startA = new Date(entry.startTime).getTime();
  const endA = entry.endTime ? new Date(entry.endTime).getTime() : startA;
  return allEntries.some((other) => {
    if (other.id === entry.id) return false;
    if (other.stageId !== entry.stageId) return false;
    const startB = new Date(other.startTime).getTime();
    const endB = other.endTime ? new Date(other.endTime).getTime() : startB;
    return startA < endB && startB < endA;
  });
}

function computeTimeline(
  dayEntries: EnrichedScheduleEntry[],
  activeDayKey: string | null,
  userStart?: string,
  userEnd?: string,
) {
  let fallbackDate = activeDayKey ? new Date(activeDayKey) : new Date();
  if (Number.isNaN(fallbackDate.getTime())) {
    fallbackDate = new Date();
  }

  let userStartTimeMs: number | null = null;
  if (userStart && activeDayKey) {
    const [h, m] = userStart.split(":");
    const d = new Date(activeDayKey);
    d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
    userStartTimeMs = d.getTime();
  }

  let userEndTimeMs: number | null = null;
  if (userEnd && activeDayKey) {
    const [h, m] = userEnd.split(":");
    const d = new Date(activeDayKey);
    d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
    userEndTimeMs = d.getTime();
  }

  let earliest = userStartTimeMs !== null ? userStartTimeMs : Infinity;
  let latest = userEndTimeMs !== null ? userEndTimeMs : -Infinity;

  if (userStartTimeMs === null || userEndTimeMs === null) {
    if (dayEntries.length === 0) {
      const fallbackStart = new Date(fallbackDate);
      fallbackStart.setHours(7, 0, 0, 0);
      return {
        timeSlots: [] as Date[],
        dayStart: fallbackStart,
        totalMinutes: 0,
      };
    }
    for (const e of dayEntries) {
      const s = new Date(e.startTime).getTime();
      if (userStartTimeMs === null && s < earliest) earliest = s;
      const end = e.endTime ? new Date(e.endTime).getTime() : s + 30 * 60000;
      if (userEndTimeMs === null && end > latest) latest = end;
    }
  }

  if (latest < earliest) latest = earliest + 60 * 60000;

  const startDate = new Date(earliest);
  startDate.setMinutes(
    Math.floor(startDate.getMinutes() / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES,
    0,
    0,
  );
  const endDate = new Date(latest);
  endDate.setMinutes(
    Math.ceil(endDate.getMinutes() / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES,
    0,
    0,
  );
  const total = differenceInMinutes(endDate, startDate);
  const slotCount = Math.ceil(total / TIME_SLOT_MINUTES);
  const slots: Date[] = [];
  for (let i = 0; i <= slotCount; i++) {
    slots.push(addMinutes(startDate, i * TIME_SLOT_MINUTES));
  }
  return { timeSlots: slots, dayStart: startDate, totalMinutes: total };
}

function EntryBlock({
  entry,
  left,
  width,
  conflict,
  colorClass,
  onClick,
}: {
  entry: EnrichedScheduleEntry;
  left: number;
  width: number;
  conflict: boolean;
  colorClass: string;
  onClick: () => void;
  allEntries: EnrichedScheduleEntry[];
}) {
  const start = parseStoredScheduleInstant(entry.startTime);
  const end = entry.endTime
    ? parseStoredScheduleInstant(entry.endTime)
    : addMinutes(start, 30);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "absolute top-2 bottom-2 rounded-md border-l-[3px] border px-2 py-1.5 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-lg hover:z-10",
              colorClass,
              conflict && "ring-2 ring-red-500/60",
            )}
            style={{
              left: `${Math.max(0, left)}%`,
              width: `${Math.max(0, width)}%`,
              minWidth: "60px",
            }}
            onClick={onClick}
          >
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium opacity-80 shrink-0">
                {safeFormat(start, "h:mm")}
              </span>
              <span className="text-[10px] opacity-60 shrink-0">
                - {safeFormat(end, "h:mm a")}
              </span>
              {conflict && (
                <AlertCircle className="size-3 text-red-500 shrink-0" />
              )}
              {entry.type === "SESSION" && (
                <Info className="size-3 opacity-50 shrink-0" />
              )}
            </div>
            <div className="text-xs font-semibold truncate mt-0.5 leading-tight">
              {getEntryLabel(entry)}
            </div>
            {entry.programme?.category?.name && (
              <div className="text-[10px] opacity-70 truncate">
                {entry.programme.category.name}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs p-4 shadow-md bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800"
        >
          <div className="space-y-3">
            <p className="font-semibold text-base tracking-tight">
              {getEntryLabel(entry)}
            </p>

            <div className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
              {entry.programme?.category?.name && (
                <div className="flex items-center gap-2">
                  <Tag className="size-4 shrink-0" />
                  <span className="truncate">
                    {entry.programme.category.name}
                  </span>
                </div>
              )}
              {entry.stage?.name && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span className="truncate">{entry.stage.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" />
                <span>{safeFormat(start, "EEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                <span>
                  {safeFormat(start, "h:mm a")}
                  {entry.endTime && ` - ${safeFormat(end, "h:mm a")}`}
                </span>
              </div>
              {entry.type === "PROGRAMME" && entry.programme && (
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0" />
                  <span>
                    {entry.programme.type === "GROUP"
                      ? `${entry.teamCount} groups`
                      : `${entry.assignmentCount} participants`}
                  </span>
                </div>
              )}
            </div>

            {conflict && (
              <p className="text-sm text-red-500 font-medium pt-1 border-t">
                Time conflict detected
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TimelineRow({
  label,
  sublabel,
  entries: rowEntries,
  allEntries,
  dayStart,
  totalMinutes,
  timeSlots,
  categoryColorMap,
  onEntryClick,
  minTrackWidth,
}: {
  label: string;
  sublabel?: string;
  entries: EnrichedScheduleEntry[];
  allEntries: EnrichedScheduleEntry[];
  dayStart: Date;
  totalMinutes: number;
  timeSlots: Date[];
  categoryColorMap: Map<string, string>;
  onEntryClick: (entry: EnrichedScheduleEntry) => void;
  minTrackWidth: number | string;
}) {
  return (
    <div className="flex border-b last:border-b-0">
      <div
        className="shrink-0 border-r bg-muted/10 px-3 py-2 flex flex-col justify-center gap-0.5"
        style={{ width: HEADER_COL_WIDTH, minHeight: ROW_HEIGHT }}
      >
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        {sublabel && (
          <span className="text-[10px] text-muted-foreground ml-[18px] truncate">
            {sublabel}
          </span>
        )}
      </div>
      <div
        className="relative shrink-0 flex-1"
        style={{ minWidth: minTrackWidth, minHeight: ROW_HEIGHT }}
      >
        {timeSlots.map((slot, i) => {
          const isLast = i === timeSlots.length - 1;
          return (
            <div
              key={i}
              className={cn(
                "absolute top-0 bottom-0 border-border/20",
                isLast ? "border-r -translate-x-full" : "border-l",
              )}
              style={{
                left: `${(differenceInMinutes(slot, dayStart) / totalMinutes) * 100}%`,
              }}
            />
          );
        })}
        {rowEntries.map((entry) => {
          const start = parseStoredScheduleInstant(entry.startTime);
          const end = entry.endTime
            ? parseStoredScheduleInstant(entry.endTime)
            : addMinutes(start, 30);
          const left =
            (differenceInMinutes(start, dayStart) / totalMinutes) * 100;
          const width = (differenceInMinutes(end, start) / totalMinutes) * 100;
          const conflict = hasConflict(entry, allEntries);
          const catName = entry.programme?.category?.name;
          const colorClass =
            entry.type === "SESSION"
              ? SESSION_COLOR
              : catName
                ? (categoryColorMap.get(catName) ?? CATEGORY_PALETTE[0])
                : CATEGORY_PALETTE[0];

          return (
            <EntryBlock
              key={entry.id}
              entry={entry}
              left={left}
              width={width}
              conflict={conflict}
              colorClass={colorClass}
              onClick={() => onEntryClick(entry)}
              allEntries={allEntries}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleCalendarView({
  entries,
  stages,
  activeDayKey,
  onEntryClick,
  searchQuery,
  groupBy,
  sortedDays,
  timelineStart,
  timelineEnd,
}: ScheduleCalendarViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(entries),
    [entries],
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      const name = getEntryLabel(e).toLowerCase();
      const stage = e.stage?.name?.toLowerCase() ?? "";
      const cat = e.programme?.category?.name?.toLowerCase() ?? "";
      return name.includes(q) || stage.includes(q) || cat.includes(q);
    });
  }, [entries, searchQuery]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [activeDayKey, groupBy]);

  // ── Group by Date: rows = stages, filtered to active day ──
  if (groupBy === "date") {
    const dayEntries = activeDayKey
      ? filteredBySearch.filter((e) => {
          const d = parseStoredScheduleInstant(e.startTime);
          return (
            !Number.isNaN(d.getTime()) &&
            format(d, "yyyy-MM-dd") === activeDayKey
          );
        })
      : [];

    if (!activeDayKey || dayEntries.length === 0) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          No entries for this day.
        </div>
      );
    }

    const { timeSlots, dayStart, totalMinutes } = computeTimeline(
      dayEntries,
      activeDayKey,
      timelineStart,
      timelineEnd,
    );
    const minTrackWidth = 800;

    return (
      <div className="rounded-lg border bg-card overflow-x-auto w-full flex flex-col">
        <div className="overflow-x-auto w-full" ref={scrollRef}>
          <div
            style={{ minWidth: "100%", width: "max-content" }}
            className="relative flex flex-col"
          >
            {/* Header */}
            <div className="flex border-b bg-muted/30 sticky top-0 z-10">
              <div
                className="shrink-0 border-r bg-card px-3 py-3 text-xs font-medium text-muted-foreground"
                style={{ width: HEADER_COL_WIDTH }}
              >
                <div className="font-semibold text-foreground text-sm">
                  ITEMS / STAGES
                </div>
                {activeDayKey && (
                  <div className="mt-1 text-[11px]">
                    {format(parseISO(activeDayKey), "MMMM d, yyyy (EEEE)")}
                  </div>
                )}
              </div>
              <div
                className="relative shrink-0 flex-1"
                style={{ minWidth: minTrackWidth }}
              >
                {timeSlots.map((slot, i) => {
                  const isLast = i === timeSlots.length - 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute top-0 bottom-0 border-border/50 py-3 text-[11px] font-medium text-muted-foreground",
                        isLast
                          ? "pr-1.5 -translate-x-full border-r"
                          : "px-1.5 border-l",
                      )}
                      style={{
                        left: `${(differenceInMinutes(slot, dayStart) / totalMinutes) * 100}%`,
                      }}
                    >
                      {format(slot, "h:mm a")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage rows */}
            {stages.map((stage) => (
              <TimelineRow
                key={stage.id}
                label={stage.name}
                entries={dayEntries.filter((e) => e.stageId === stage.id)}
                allEntries={dayEntries}
                dayStart={dayStart}
                totalMinutes={totalMinutes}
                timeSlots={timeSlots}
                categoryColorMap={categoryColorMap}
                onEntryClick={onEntryClick}
                minTrackWidth={minTrackWidth}
              />
            ))}

            {/* Unassigned */}
            {dayEntries.some((e) => !e.stageId) && (
              <TimelineRow
                label="No stage"
                entries={dayEntries.filter((e) => !e.stageId)}
                allEntries={dayEntries}
                dayStart={dayStart}
                totalMinutes={totalMinutes}
                timeSlots={timeSlots}
                categoryColorMap={categoryColorMap}
                onEntryClick={onEntryClick}
                minTrackWidth={minTrackWidth}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Group by Stage: rows = dates ──
  if (filteredBySearch.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        No schedule entries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stages.map((stage) => {
        const stageEntries = filteredBySearch.filter(
          (e) => e.stageId === stage.id,
        );
        if (stageEntries.length === 0) return null;

        const byDay = new Map<string, EnrichedScheduleEntry[]>();
        for (const e of stageEntries) {
          const d = parseStoredScheduleInstant(e.startTime);
          const key = format(d, "yyyy-MM-dd");
          if (!byDay.has(key)) byDay.set(key, []);
          byDay.get(key)!.push(e);
        }
        const dayKeys = [...byDay.keys()].sort();

        return (
          <div key={stage.id}>
            <h3 className="text-sm font-semibold mb-2 text-foreground">
              {stage.name}
            </h3>
            <div className="rounded-lg border bg-card overflow-hidden w-full flex flex-col">
              <div className="overflow-x-auto w-full" ref={scrollRef}>
                <div
                  style={{ minWidth: "100%", width: "max-content" }}
                  className="relative flex flex-col"
                >
                  {dayKeys.map((dayKey) => {
                    const dayEntries = byDay.get(dayKey)!;
                    const { timeSlots, dayStart, totalMinutes } =
                      computeTimeline(
                        dayEntries,
                        dayKey,
                        timelineStart,
                        timelineEnd,
                      );
                    const minTrackWidth = 600;

                    return (
                      <div key={dayKey}>
                        {/* Day header */}
                        <div className="flex border-b bg-muted/30 sticky top-0 z-10">
                          <div
                            className="shrink-0 border-r bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                            style={{ width: HEADER_COL_WIDTH }}
                          >
                            {format(parseISO(dayKey), "EEE, MMM d")}
                          </div>
                          <div
                            className="relative shrink-0 flex-1"
                            style={{ minWidth: minTrackWidth }}
                          >
                            {timeSlots.map((slot, i) => {
                              const isLast = i === timeSlots.length - 1;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "absolute top-0 bottom-0 border-border/50 py-2 text-[11px] font-medium text-muted-foreground",
                                    isLast
                                      ? "pr-1.5 -translate-x-full border-r"
                                      : "px-1.5 border-l",
                                  )}
                                  style={{
                                    left: `${(differenceInMinutes(slot, dayStart) / totalMinutes) * 100}%`,
                                  }}
                                >
                                  {format(slot, "h:mm a")}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <TimelineRow
                          label={format(parseISO(dayKey), "MMM d")}
                          sublabel={format(parseISO(dayKey), "EEEE")}
                          entries={dayEntries}
                          allEntries={stageEntries}
                          dayStart={dayStart}
                          totalMinutes={totalMinutes}
                          timeSlots={timeSlots}
                          categoryColorMap={categoryColorMap}
                          onEntryClick={onEntryClick}
                          minTrackWidth={minTrackWidth}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
