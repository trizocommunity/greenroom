"use client";

import { CalendarDays } from "lucide-react";

export function FestivalEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <CalendarDays className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-heading mb-2">
        Not created yet
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Start organizing your festival and bring people together for an amazing
        experience.
      </p>
    </div>
  );
}
