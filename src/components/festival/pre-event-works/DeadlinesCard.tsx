"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock } from "lucide-react";
import { DeadlineCountdown } from "@/components/festival/pre-event-works/DeadlineCountdown";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";

/**
 * Window status for a team-leader action (participants, assignments).
 *
 * Before the window opens it shows both dates ("Aug 5, 9:00 AM →
 * Aug 20, 5:00 PM"); once open it shows only the closing time, which is
 * the deadline that matters from then on.
 *
 * Team-leader surfaces only — the dashboard doesn't render this.
 */
export function DeadlinesCard({
  label = "Assignments",
  start,
  end,
}: {
  label?: string;
  start?: string | Date | null;
  end?: string | Date | null;
}) {
  const displayTz = useDisplayTimezone();
  const {
    state,
    start: startDate,
    end: endDate,
  } = useDeadlineWindow(start, end);

  if (!startDate && !endDate) return null;

  const format = (date: Date) =>
    formatInTimeZone(date, displayTz, "MMM d, h:mm a");

  const tone =
    state === "CLOSED"
      ? "bg-destructive/10 border-destructive/20 text-destructive"
      : "bg-muted/50 border-border text-muted-foreground";

  return (
    <div
      className={`flex flex-row items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${tone}`}
    >
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-4 w-4" />
        <span className="flex items-center font-medium text-foreground">
          {label}
          <span className="hidden lg:block">
            {state === "UPCOMING" ? "Window" : "Close"}
          </span>
          :
        </span>
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-normal">
        <span className="whitespace-nowrap">
          {state === "UPCOMING"
            ? `${startDate ? format(startDate) : "—"} → ${
                endDate ? format(endDate) : "no deadline"
              }`
            : endDate
              ? format(endDate)
              : "No deadline"}
        </span>
        {state === "OPEN" && endDate ? (
          <span className="whitespace-nowrap text-xs">
            (<DeadlineCountdown target={endDate} /> left)
          </span>
        ) : null}
        <DeadlineStateBadge state={state} />
      </div>
    </div>
  );
}

function DeadlineStateBadge({
  state,
}: {
  state: "UPCOMING" | "OPEN" | "CLOSED";
}) {
  if (state === "CLOSED") {
    return (
      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase">
        Closed
      </Badge>
    );
  }

  if (state === "UPCOMING") {
    return (
      <Badge
        variant="outline"
        className="h-5 border-amber-500/50 bg-amber-500/10 px-1.5 text-[10px] uppercase text-amber-600"
      >
        Not open
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="h-5 border-green-500/50 bg-green-500/10 px-1.5 text-[10px] uppercase text-green-600"
    >
      Active
    </Badge>
  );
}
