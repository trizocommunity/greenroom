"use client";

import { format, isPast } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, MapPin, Mic2, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const EVENT_TYPE_LABELS: Record<string, string> = {
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
  event: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    speakers: string | null;
  };
  stage: { id: string; name: string } | null;
};

export function PublicSessionCards({ entries }: { entries: SessionEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <SessionCard key={entry.id} entry={entry} />
      ))}
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
    EVENT_TYPE_LABELS[entry.event.type] ?? entry.event.type ?? "Session";

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
          {entry.event.name}
        </h3>

        {/* Speakers */}
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span className="line-clamp-1">
            {entry.event.speakers?.trim() || "—"}
          </span>
        </p>

        {/* Description (expandable) */}
        {entry.event.description && (
          <div className="mt-4 flex flex-1 flex-col border-t border-border/60 pt-4">
            {showMore ? (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {entry.event.description}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {entry.event.description}
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

        {!entry.event.description && (
          <div className="mt-auto pt-4">
            <span className="text-sm text-muted-foreground">—</span>
          </div>
        )}
      </div>
    </article>
  );
}
