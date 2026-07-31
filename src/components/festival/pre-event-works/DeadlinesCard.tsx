"use client";

import { isPast } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock } from "lucide-react";
import { useFestival } from "@/components/festival/FestivalContext";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { parseInstant } from "@/core/datetime";

export function DeadlinesCard({
  label = "Assignments",
  deadline: deadlineProp,
  isLockedOverride,
}: {
  label?: string;
  deadline?: string | Date | null;
  isLockedOverride?: boolean;
} = {}) {
  const festival = useFestival();
  const displayTz = useDisplayTimezone();

  const deadline =
    deadlineProp !== undefined
      ? deadlineProp
      : festival.programmeAssignmentDeadline;

  if (!deadline) return null;

  const deadlineDate = parseInstant(deadline);
  const isExpired = isLockedOverride ?? (deadlineDate ? isPast(deadlineDate) : false);

  return (
    <div
      className={`flex  flex-row items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
        isExpired
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : "bg-muted/50 border-border text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-4 w-4" />
        <span className="font-medium text-foreground flex  items-center">
          {label}
          <span className="hidden lg:block">Close</span>:
        </span>
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-normal">
        <span className="whitespace-nowrap">
          {deadlineDate
            ? formatInTimeZone(deadlineDate, displayTz, "MMM d, h:mm a")
            : "—"}
        </span>
        {isExpired ? (
          <Badge
            variant="destructive"
            className="h-5 px-1.5 text-[10px] uppercase"
          >
            Closed
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[10px] uppercase border-green-500/50 text-green-600 bg-green-500/10"
          >
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}
