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
    <div className="flex flex-row items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
      <CalendarClock className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">
        {state === "CLOSED" ? (
          <>
            <span className="font-medium text-foreground">{label}</span> closed
            for team leaders
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{label}</span>{" "}
            {state === "UPCOMING" ? "open in" : "close in"}{" "}
            <DeadlineCountdown
              target={target}
              className="font-medium text-foreground"
            />
          </>
        )}
      </span>
    </div>
  );
}
