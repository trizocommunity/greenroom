"use client";

import { format } from "date-fns";
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

export type ProgrammeEntry = {
  id: string;
  startTime: string;
  endTime: string | null;
  programme: {
    id: string;
    name: string;
    category: { name: string } | null;
  };
  stage: { id: string; name: string } | null;
};

type ProgrammesByDayProps = {
  days: {
    dateKey: string;
    tabLabel: string;
    label: string;
    entries: ProgrammeEntry[];
  }[];
};

const ALL_STAGES_VALUE = "__all__";

export function ProgrammesByDay({ days }: ProgrammesByDayProps) {
  const [activeDay, setActiveDay] = useState(days[0]?.dateKey ?? "");
  const [activeStageId, setActiveStageId] = useState("");

  const activeData = days.find((d) => d.dateKey === activeDay);

  const stagesForDay = useMemo(() => {
    if (!activeData) return [];
    const seen = new Map<string, { id: string; name: string }>();
    for (const e of activeData.entries) {
      if (e.stage && !seen.has(e.stage.id)) seen.set(e.stage.id, e.stage);
    }
    return Array.from(seen.values());
  }, [activeData]);

  const filteredEntries =
    activeData && activeStageId === ""
      ? activeData.entries
      : activeData && activeStageId !== ""
        ? activeData.entries.filter((e) => e.stage?.id === activeStageId)
        : [];

  if (days.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Day tabs */}
      <div
        className="flex flex-wrap gap-2 border-b border-border pb-2"
        role="tablist"
      >
        {days.map(({ dateKey, tabLabel, entries: dayEntries }) => (
          <button
            key={dateKey}
            type="button"
            role="tab"
            aria-selected={activeDay === dateKey}
            onClick={() => {
              setActiveDay(dateKey);
              setActiveStageId("");
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeDay === dateKey
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tabLabel}
            <span className="ml-2 opacity-80">({dayEntries.length})</span>
          </button>
        ))}
      </div>

      {/* Content for selected day */}
      {activeData && (
        <div role="tabpanel" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {activeData.label}
            </h2>
            {stagesForDay.length > 0 && (
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
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredEntries.length} programme
            {filteredEntries.length !== 1 ? "s" : ""}
            {activeStageId !== "" &&
              activeData.entries.length !== filteredEntries.length &&
              " on this stage"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <ProgrammeCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgrammeCard({ entry }: { entry: ProgrammeEntry }) {
  const start = parseStoredScheduleInstant(entry.startTime);
  const end = entry.endTime ? parseStoredScheduleInstant(entry.endTime) : null;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <time
        className="text-sm font-semibold text-muted-foreground tabular-nums block mb-2"
        dateTime={entry.startTime}
      >
        {format(start, "h:mm a")}
        {end && ` – ${format(end, "h:mm a")}`}
      </time>
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <h3 className="font-bold text-lg tracking-tight">
          {entry.programme.name}
        </h3>
        {entry.programme.category?.name && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {entry.programme.category.name}
          </span>
        )}
      </div>
      {entry.stage?.name && (
        <p className="text-sm font-medium text-primary">
          Stage {entry.stage.name}
        </p>
      )}
    </article>
  );
}
