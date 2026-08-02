"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, Lock } from "lucide-react";
import { DeadlineCountdownBlocks } from "@/components/festival/pre-event-works/DeadlineCountdown";
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
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-6 text-center sm:p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <Lock className="h-5 w-5" />
        </span>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-heading sm:text-xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Opens in
          </p>
          <DeadlineCountdownBlocks target={start} />
        </div>

        <dl className="grid w-full gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Opens
            </dt>
            <dd className="mt-1 text-sm font-medium text-heading">
              {start ? stamp(start) : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Closes
            </dt>
            <dd className="mt-1 text-sm font-medium text-heading">
              {end ? stamp(end) : "No deadline"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
