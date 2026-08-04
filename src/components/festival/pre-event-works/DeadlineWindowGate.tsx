"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, Lock } from "lucide-react";
import { DeadlineCountdownLarge } from "@/components/festival/pre-event-works/DeadlineCountdown";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";

/**
 * Full-section replacement shown to Team Leaders while a window hasn't
 * opened yet. It takes over the whole screen body — there is nothing
 * useful to do underneath it until the countdown hits zero.
 */
export function DeadlineWindowGate({
  title,
  description,
  start,
  end,
}: {
  title: string;
  description: string;
  start: Date | null;
  end: Date | null;
}) {
  const displayTz = useDisplayTimezone();
  const stamp = (date: Date) =>
    formatInTimeZone(date, displayTz, "EEE, MMM d • h:mm a");

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-6 text-center sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
        <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">
          <Lock className="h-3 w-3" />
          Locked
        </span>

        <div className="space-y-1">
          <h2 className="text-balance text-base font-semibold text-heading sm:text-lg">
            {title}
          </h2>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Opens in
          </p>
          <DeadlineCountdownLarge target={start} className="mt-1" />
        </div>

        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Opens{" "}
            <span className="font-medium text-heading">
              {start ? stamp(start) : "—"}
            </span>
          </span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>
            Closes{" "}
            <span className="font-medium text-heading">
              {end ? stamp(end) : "no deadline"}
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
