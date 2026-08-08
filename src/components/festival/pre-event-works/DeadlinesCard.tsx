"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock } from "lucide-react";
import { DeadlineCountdown } from "@/components/festival/pre-event-works/DeadlineCountdown";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/utils/cn";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";

/**
 * Window status for a team-leader action (participants, assignments).
 *
 * Once the window is open the live countdown is the headline and the
 * absolute closing time is the supporting detail — it drops out below
 * `sm` so the badge fits a phone header without pushing the page wide.
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
      className={cn(
        "flex w-full min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-1.5 text-xs sm:w-auto sm:text-sm",
        tone,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span className="truncate font-medium text-foreground">{label}</span>
        <DeadlineStateBadge state={state} />
      </span>

      {state === "OPEN" ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {endDate ? (
            <>
              <DeadlineCountdown
                target={endDate}
                className="font-semibold text-foreground"
              />
              <span className="hidden truncate sm:inline">
                · closes {format(endDate)}
              </span>
            </>
          ) : (
            <span className="truncate">No deadline</span>
          )}
        </span>
      ) : (
        <span className="min-w-0 truncate">
          {state === "UPCOMING"
            ? `Opens ${startDate ? format(startDate) : "—"}`
            : endDate
              ? `Closed ${format(endDate)}`
              : "Closed"}
        </span>
      )}
    </div>
  );
}

function DeadlineStateBadge({
  state,
}: {
  state: "UPCOMING" | "OPEN" | "CLOSED" | "UNCONFIGURED";
}) {
  if (state === "UNCONFIGURED") return null;

  if (state === "CLOSED") {
    return (
      <Badge
        variant="destructive"
        className="h-5 shrink-0 px-1.5 text-[10px] uppercase"
      >
        Closed
      </Badge>
    );
  }

  if (state === "UPCOMING") {
    return (
      <Badge
        variant="outline"
        className="h-5 shrink-0 border-amber-500/50 bg-amber-500/10 px-1.5 text-[10px] uppercase text-amber-600"
      >
        Not open
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="h-5 shrink-0 border-green-500/50 bg-green-500/10 px-1.5 text-[10px] uppercase text-green-600"
    >
      Active
    </Badge>
  );
}
