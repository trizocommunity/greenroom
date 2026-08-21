"use client";

import { Calendar } from "lucide-react";

export type ScheduleEmptyStateProps = {
  isReadOnly: boolean;
  hasStages: boolean;
  hasProgrammes: boolean;
  hasFestivalDates: boolean;
};

export function ScheduleEmptyState({
  isReadOnly,
  hasStages,
  hasProgrammes,
  hasFestivalDates,
}: ScheduleEmptyStateProps) {
  const headline = isReadOnly
    ? "No schedule entries."
    : !hasStages
      ? "No stages yet"
      : !hasProgrammes
        ? "No programmes yet"
        : !hasFestivalDates
          ? "Set festival event dates"
          : "No schedule entries yet";

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
      <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
      <p className="font-medium">{headline}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {!isReadOnly &&
          hasStages &&
          hasProgrammes &&
          hasFestivalDates &&
          "Click 'Add Schedule' to start building your competition schedule."}
      </p>
    </div>
  );
}
