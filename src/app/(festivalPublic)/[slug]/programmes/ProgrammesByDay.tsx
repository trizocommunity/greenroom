"use client";

import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

export function ProgrammesByDay({ days }: ProgrammesByDayProps) {
  const [activeDay, setActiveDay] = useState(days[0]?.dateKey ?? "");

  const activeData = days.find((d) => d.dateKey === activeDay);

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
            onClick={() => setActiveDay(dateKey)}
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
          <h2 className="text-xl font-semibold text-foreground">
            {activeData.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeData.entries.map((entry) => (
              <ProgrammeCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgrammeCard({ entry }: { entry: ProgrammeEntry }) {
  const start = new Date(entry.startTime);
  const end = entry.endTime ? new Date(entry.endTime) : null;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <time
        className="text-sm font-semibold text-muted-foreground tabular-nums block mb-2"
        dateTime={entry.startTime}
      >
        {format(start, "h:mm a")}
        {end && ` – ${format(end, "h:mm a")}`}
      </time>
      <h3 className="font-bold text-lg tracking-tight mb-1">
        {entry.programme.name}
      </h3>
      {entry.programme.category?.name && (
        <p className="text-sm text-muted-foreground mb-2">
          {entry.programme.category.name}
        </p>
      )}
      {entry.stage?.name && (
        <p className="text-sm font-medium text-primary">Stage {entry.stage.name}</p>
      )}
    </article>
  );
}
