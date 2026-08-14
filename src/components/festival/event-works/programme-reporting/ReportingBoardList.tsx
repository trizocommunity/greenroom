"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ReportingBoardItem } from "./types";
import { useEffect, useState } from "react";

function ProgrammeTimer({
  startedAt,
  durationMinutes,
}: {
  startedAt: Date;
  durationMinutes: number;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const end = startedAt.getTime() + durationMinutes * 60 * 1000;
    const update = () => {
      setTimeLeft(end - Date.now());
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes]);

  const isEnding = timeLeft <= 60000 && timeLeft > 0; // last minute
  const isOver = timeLeft <= 0;

  if (isOver) {
    return (
      <span className="text-xs font-mono font-bold text-red-500 animate-pulse bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
        00:00
      </span>
    );
  }

  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return (
    <span
      className={cn(
        "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
        isEnding
          ? "text-red-500 animate-pulse bg-red-50 dark:bg-red-950/30"
          : "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
      )}
    >
      {formatted}
    </span>
  );
}

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
            const isUnscheduled = item.scheduleEntry == null;

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
                    {item.programme.name}
                  </p>
                  {(() => {
                    const timerStart = item.reportingSession?.endedAt
                      ? (typeof item.reportingSession.endedAt === "string"
                          ? parseInstant(item.reportingSession.endedAt)
                          : item.reportingSession.endedAt)
                      : item.reportingSession?.startedAt;

                    if (!timerStart) return null;

                    const durationMinutes =
                      item.programme.durationMode === "PARALLEL"
                        ? (item.programme.parallelDurationMinutes ??
                          item.programme.timePerUnitMinutes)
                        : item.programme.timePerUnitMinutes;

                    if (!durationMinutes || durationMinutes <= 0) return null;

                    return (
                      <div className="shrink-0 mt-1">
                        <ProgrammeTimer
                          startedAt={timerStart}
                          durationMinutes={durationMinutes}
                        />
                      </div>
                    );
                  })()}
                </div>
                {item.programme.category?.name ? (
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
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    {(() => {
                      const scheduled = item.startTime
                        ? parseInstant(item.startTime)
                        : null;
                      const started = item.reportingSession?.endedAt
                        ? (typeof item.reportingSession.endedAt === "string"
                            ? parseInstant(item.reportingSession.endedAt)
                            : item.reportingSession.endedAt)
                        : item.reportingSession?.startedAt;

                      const schStr = scheduled
                        ? formatInTimeZone(scheduled, displayTz, "h:mm a")
                        : "—";

                      if (started) {
                        return (
                          <>
                            <span className="line-through opacity-70">
                              {schStr}
                            </span>
                            <span className="text-foreground font-medium">
                              {formatInTimeZone(started, displayTz, "h:mm a")}
                            </span>
                          </>
                        );
                      }
                      return schStr;
                    })()}
                  </span>
                  {item.stage?.name ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      · {item.stage.name}
                    </span>
                  ) : null}
                  {isUnscheduled ? (
                    <Badge
                      variant="outline"
                      className="h-6 px-2 text-[10px] uppercase font-bold tracking-wider"
                    >
                      Unscheduled
                    </Badge>
                  ) : null}
                </div>
              </button>
            );
          })}
    </div>
  );
}
