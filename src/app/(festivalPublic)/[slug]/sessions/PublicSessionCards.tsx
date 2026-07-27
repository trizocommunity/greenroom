"use client";

import { format, isPast, parseISO } from "date-fns";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mic2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

const SESSION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

export type SessionEntry = {
  id: string;
  /** When null, session is not yet scheduled (show "Date & time TBA") */
  startTime: string | null;
  endTime: string | null;
  session: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    speakers: string | null;
  };
  stage: { id: string; name: string } | null;
};

const ALL_STAGES_VALUE = "__all__";
const TBA_DAY_KEY = "__tba__";

export function PublicSessionCards({ entries }: { entries: SessionEntry[] }) {
  const { groupedByDay, sortedDayKeys, dayLabels } = useMemo(() => {
    const byDay: Record<string, SessionEntry[]> = {};
    for (const e of entries) {
      const key = e.startTime
        ? format(parseStoredScheduleInstant(e.startTime), "yyyy-MM-dd")
        : TBA_DAY_KEY;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(e);
    }
    const keys = Object.keys(byDay).sort((a, b) => {
      if (a === TBA_DAY_KEY) return 1;
      if (b === TBA_DAY_KEY) return -1;
      return a.localeCompare(b);
    });
    const labels: Record<string, string> = {};
    keys.forEach((k, i) => {
      labels[k] = k === TBA_DAY_KEY ? "Date & time TBA" : `Day ${i + 1}`;
    });
    return { groupedByDay: byDay, sortedDayKeys: keys, dayLabels: labels };
  }, [entries]);

  const [activeDayKey, setActiveDayKey] = useState(sortedDayKeys[0] ?? "");
  const [activeStageId, setActiveStageId] = useState("");

  const dayEntries = activeDayKey ? (groupedByDay[activeDayKey] ?? []) : [];
  const stagesForDay = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const e of dayEntries) {
      if (e.stage && !seen.has(e.stage.id)) seen.set(e.stage.id, e.stage);
    }
    return Array.from(seen.values());
  }, [dayEntries]);

  const filteredEntries =
    activeStageId === ""
      ? dayEntries
      : dayEntries.filter((e) => e.stage?.id === activeStageId);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Day tabs */}
      {sortedDayKeys.length > 1 && (
        <div
          className="flex flex-wrap gap-2 border-b border-border pb-3"
          role="tablist"
        >
          {sortedDayKeys.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeDayKey === key}
              onClick={() => {
                setActiveDayKey(key);
                setActiveStageId("");
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeDayKey === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {dayLabels[key]}
              <span className="ml-2 opacity-80">
                ({(groupedByDay[key] ?? []).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Stage filter + list for selected day */}
      <div className="space-y-4">
        {sortedDayKeys.length > 1 && (
          <h2 className="text-xl font-semibold text-foreground">
            {dayLabels[activeDayKey]}
          </h2>
        )}
        {stagesForDay.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={activeStageId === "" ? ALL_STAGES_VALUE : activeStageId}
              onValueChange={(v) =>
                setActiveStageId(v === ALL_STAGES_VALUE ? "" : v)
              }
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STAGES_VALUE}>All stages</SelectItem>
                {stagesForDay.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {filteredEntries.length} session
              {filteredEntries.length !== 1 ? "s" : ""}
              {activeStageId !== "" &&
                dayEntries.length !== filteredEntries.length &&
                " on this stage"}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry) => (
            <SessionCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ entry }: { entry: SessionEntry }) {
  const [showMore, setShowMore] = useState(false);
  const hasSchedule = entry.startTime != null;
  const start = entry.startTime
    ? parseStoredScheduleInstant(entry.startTime)
    : null;
  const end = entry.endTime ? parseStoredScheduleInstant(entry.endTime) : null;
  const isPastEvent = hasSchedule && start ? isPast(end || start) : false;
  const typeLabel =
    SESSION_TYPE_LABELS[entry.session.type] ?? entry.session.type ?? "Session";

  return (
    <article
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md",
      )}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/40 to-primary/10" />
      <div className="flex-1 p-5 pb-0">
        {/* Title and Type Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-2">
              {entry.session.name}
            </h3>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Mic2 className="h-3.5 w-3.5" />
              {typeLabel}
            </span>
          </div>
          {isPastEvent && (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Past
            </span>
          )}
        </div>

        {/* Speakers */}
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span className="line-clamp-1">
            {entry.session.speakers?.trim() || "—"}
          </span>
        </p>

        {/* Description (expandable) */}
        {entry.session.description && (
          <div className="mt-4 flex flex-col pt-2 border-t border-border/60">
            {showMore ? (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {entry.session.description}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {entry.session.description}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {showMore ? (
                <>
                  Show less <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Know more <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {!entry.session.description && (
          <div className="mt-4 pt-2 border-t border-border/60">
            <span className="text-sm text-muted-foreground">—</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-4" />

      {/* Date/time and Stage in footer */}
      <div className="mx-5 mb-5 mt-4 flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5 border border-border/40">
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {hasSchedule && start ? (
            <time
              className="inline-flex items-center gap-2 font-medium tabular-nums"
              dateTime={entry.startTime!}
            >
              <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
              {format(start, "EEE, d MMM yyyy")} ·{" "}
              {end
                ? `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
                : format(start, "h:mm a")}
            </time>
          ) : (
            <span className="inline-flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
              Date & time TBA
            </span>
          )}

          {entry.stage?.name && (
            <span className="inline-flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
              {entry.stage.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
