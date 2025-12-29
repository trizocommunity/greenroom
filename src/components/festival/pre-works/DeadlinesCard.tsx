"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFestival } from "@/components/festival/FestivalContext";
import { CalendarClock } from "lucide-react";
import { format, isPast } from "date-fns";

export function DeadlinesCard() {
  const festival = useFestival();

  const deadline = festival.programmeAssignmentDeadline;

  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const isExpired = isPast(deadlineDate);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 text-sm ${
        isExpired
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : "bg-muted/50 border-border text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-4 w-4" />
        <span className="font-medium text-foreground">Assignments close:</span>
      </div>

      <div className="flex items-center gap-2">
        <span>{format(deadlineDate, "MMM d, h:mm a")}</span>
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
