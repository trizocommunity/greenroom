"use client";

import { useRef } from "react";
import { cn } from "@/core/utils/cn";
import type { GroupedByDay } from "./hooks/useScheduleDerived";

export type ScheduleDayTabsProps = {
  sortedDays: string[];
  groupedByDay: GroupedByDay;
  activeDay: string | null;
  onActiveDayChange: (dayKey: string) => void;
};

export function ScheduleDayTabs({
  sortedDays,
  groupedByDay,
  activeDay,
  onActiveDayChange,
}: ScheduleDayTabsProps) {
  const dayTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (sortedDays.length === 0) return null;

  return (
    <div
      className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto gap-2 border-b border-border pb-3"
      role="tablist"
    >
      {sortedDays.map((dayKey, index) => {
        const dayCount = groupedByDay[dayKey].length;
        const isActive = activeDay === dayKey;
        const node = dayTabRefs.current[dayKey];
        if (node && isActive) {
          node.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
        return (
          <button
            key={dayKey}
            ref={(el) => {
              dayTabRefs.current[dayKey] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onActiveDayChange(dayKey)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 snap-center",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Day {index + 1}
            <span className="ml-2 opacity-80">({dayCount})</span>
          </button>
        );
      })}
    </div>
  );
}
