"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/utils/cn";
import { parseStoredInstant } from "@/core/utils/date-time";
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
  assignmentCountByProgrammeId,
}: ReportingBoardListProps) {
  const statusTone = (status: string) => {
    if (status === "IN_PROGRESS")
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (status === "NOT_STARTED")
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    if (status === "CLOSED")
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    return "border-border bg-muted/40 text-muted-foreground";
  };

  return (
    <div className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[calc(100vh-250px)] sm:max-h-[calc(100vh-320px)]">
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">No programmes found matching filters.</p>
        </div>
      ) : (
        items.map((item) => {
          const uiStatus = getUiReportingStatus(
            item.reportingSession?.status,
            item.reportingSession?.windowEndsAt ?? null,
          );
          const isSelected = selectedId === item.id;
          const progId = item.programme?.id;
          const assignCount =
            progId && assignmentCountByProgrammeId
              ? assignmentCountByProgrammeId.get(progId)
              : undefined;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "group flex flex-col gap-1.5 p-3 text-left rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20 shadow-sm"
                  : "bg-card hover:bg-muted/40 border-border/70 hover:border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "font-medium leading-none line-clamp-2",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {item.programme?.name}
                </p>
                {item.reportingSession?.status === "IN_PROGRESS" && (
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className="absolute h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75" />
                    <div className="relative h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
              {item.programme?.category?.name ? (
                <p className="text-[11px] text-muted-foreground truncate">
                  {item.programme.category.name}
                </p>
              ) : null}

              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-[10px] uppercase font-semibold tracking-wider",
                    statusTone(uiStatus),
                  )}
                >
                  {uiStatus.replace("_", " ")}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {format(parseStoredInstant(item.startTime), "h:mm a")}
                </span>
                {item.stage?.name && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                    · {item.stage.name}
                  </span>
                )}
                {assignCount != null && assignCount > 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    · {assignCount} assigned
                  </span>
                ) : null}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
