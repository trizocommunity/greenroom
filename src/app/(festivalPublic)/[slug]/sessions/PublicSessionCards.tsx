"use client";

import { format, isPast, parseISO } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, MapPin, Mic2, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        ? format(new Date(e.startTime), "yyyy-MM-dd")
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
      labels[k] =
        k === TBA_DAY_KEY ? "Date & time TBA" : `Day ${i + 1}`;
    });
    return { groupedByDay: byDay, sortedDayKeys: keys, dayLabels: labels };
  }, [entries]);

  const [activeDayKey, setActiveDayKey] = useState(
    sortedDayKeys[0] ?? "",
  );
  const [activeStageId, setActiveStageId] = useState("");

  const dayEntries = activeDayKey ? groupedByDay[activeDayKey] ?? [] : [];
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
              <span className="ml-2 opacity-80">({(groupedByDay[key] ?? []).length})</span>
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
              {activeStageId !== "" && dayEntries.length !== filteredEntries.length && " on this stage"}
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
  const start = entry.startTime ? new Date(entry.startTime) : null;
  const end = entry.endTime ? new Date(entry.endTime) : null;
  const isPastEvent = hasSchedule && start ? isPast(end || start) : false;
  const typeLabel =
    SESSION_TYPE_LABELS[entry.session.type] ?? entry.session.type ?? "Session";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:shadow-lg hover:border-primary/20",
      )}
    >
      {/* Accent strip + type badge */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Mic2 className="h-3.5 w-3.5" />
          {typeLabel}
        </span>
        {isPastEvent && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Past
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Date/time or TBA */}
        <div className="mb-3">
          {hasSchedule && start ? (
            <time
              className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground tabular-nums"
              dateTime={entry.startTime!}
            >
              <Calendar className="h-4 w-4 text-primary" />
              {format(start, "EEE, d MMM yyyy")} ·{" "}
              {end
                ? `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
                : format(start, "h:mm a")}
            </time>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Date & time TBA
            </span>
          )}
        </div>

        {/* Stage chip */}
        {entry.stage?.name && (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
            <MapPin className="h-3.5 w-3.5" />
            {entry.stage.name}
          </span>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-2">
          {entry.session.name}
        </h3>

        {/* Speakers */}
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span className="line-clamp-1">
            {entry.session.speakers?.trim() || "—"}
          </span>
        </p>

        {/* Description (expandable) */}
        {entry.session.description && (
          <div className="mt-4 flex flex-1 flex-col border-t border-border/60 pt-4">
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
          <div className="mt-auto pt-4">
            <span className="text-sm text-muted-foreground">—</span>
          </div>
        )}
      </div>
    </article>
  );
}
