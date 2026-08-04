"use client";

import { CalendarClock } from "lucide-react";
import { DeadlineCountdown } from "@/components/festival/pre-event-works/DeadlineCountdown";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";

/**
 * Slim, non-blocking countdown for the organiser dashboard: how long
 * until Team Leaders can start, or until they're locked out. The
 * dashboard itself is never gated by these dates.
 */
export function DeadlineWindowChip({
  label,
  start,
  end,
}: {
  label: string;
  start?: string | Date | null;
  end?: string | Date | null;
}) {
  const {
    state,
    start: startDate,
    end: endDate,
  } = useDeadlineWindow(start, end);

  if (!startDate && !endDate) return null;

  const target = state === "UPCOMING" ? startDate : endDate;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground sm:px-3 sm:text-sm">
      <CalendarClock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
      <span className="min-w-0 text-pretty">
        {state === "CLOSED" ? (
          <>
            <span className="font-medium text-foreground">{label}</span> closed
            for team leaders
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{label}</span>{" "}
            {state === "UPCOMING" ? "opens in" : "closes in"}{" "}
            <DeadlineCountdown
              target={target}
              className="font-semibold text-foreground"
            />
          </>
        )}
      </span>
    </div>
  );
}
