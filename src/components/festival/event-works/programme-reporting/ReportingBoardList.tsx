"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ReportingBoardItem } from "./types";

interface ReportingBoardListProps {
  items: ReportingBoardItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getUiReportingStatus: (
    status: string | undefined,
    windowEndsAt: Date | null,
  ) => string;
  /** Optional: assignment count per programme for list context */
  assignmentCountByProgrammeId?: Map<string, number>;
}

export function ReportingBoardList({
  items,
  selectedId,
  onSelect,
  getUiReportingStatus,
}: ReportingBoardListProps) {
  const displayTz = useDisplayTimezone();
  const statusTone = (status: string) => {
    if (status === "IN_PROGRESS")
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (status === "NOT_STARTED")
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    if (status === "CLOSED") return "border-purple/30 bg-purple/10 text-purple";
    return "border-border bg-muted/40 text-muted-foreground";
  };

  return (
    <div className="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.length === 0
        ? null
        : items.map((item) => {
            const uiStatus = getUiReportingStatus(
              item.reportingSession?.status,
              item.reportingSession?.windowEndsAt ?? null,
            );
            const isSelected = selectedId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "group flex flex-col gap-2 p-4 text-left rounded-xl border transition-all duration-200",
                  isSelected
                    ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20 shadow-sm"
                    : "bg-card border-border hover:border-primary/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      "font-semibold text-base leading-snug line-clamp-2",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {item.programme?.name}
                  </p>
                  {item.reportingSession?.status === "IN_PROGRESS" && (
                    <div className="relative flex items-center justify-center shrink-0 mt-1">
                      <div className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-red-400 opacity-75" />
                      <div className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
                {item.programme?.category?.name ? (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.programme.category.name}
                  </p>
                ) : null}

                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6 px-2 text-[11px] uppercase font-bold tracking-wider",
                      statusTone(uiStatus),
                    )}
                  >
                    {uiStatus.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {(() => {
                      const d = parseInstant(item.startTime);
                      return d ? formatInTimeZone(d, displayTz, "h:mm a") : "—";
                    })()}
                  </span>
                  {item.stage?.name && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      · {item.stage.name}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
    </div>
  );
}
