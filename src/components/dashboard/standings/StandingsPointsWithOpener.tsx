"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/core/utils/cn";
import type { GeneralEntryStandingDetail } from "@/features/announcement/services/team-standings.read-model";

interface StandingsPointsWithOpenerProps {
  teamName: string;
  points: number;
  programmePoints?: number;
  generalPoints?: number;
  generalEntries?: GeneralEntryStandingDetail[];
  className?: string;
  unit?: string;
}

export function StandingsPointsWithOpener({
  teamName,
  points,
  programmePoints,
  generalPoints,
  generalEntries,
  className,
  unit,
}: StandingsPointsWithOpenerProps) {
  const hasPublishedGeneral = generalPoints != null && generalPoints !== 0;

  if (!hasPublishedGeneral) {
    return (
      <span className={cn("font-mono font-bold", className)}>
        {points}
        {unit && (
          <span className="text-xs text-muted-foreground font-normal ml-1">
            {unit}
          </span>
        )}
      </span>
    );
  }

  const basePoints = programmePoints ?? points - generalPoints;
  const sign = generalPoints > 0 ? "+" : "-";
  const absGeneral = Math.abs(generalPoints);
  const formulaText = `${basePoints} ${sign} ${absGeneral} = ${points}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 cursor-pointer font-mono font-bold hover:opacity-80 transition-all whitespace-nowrap shrink-0",
              className,
            )}
          >
            <span>{points}</span>
            {unit && (
              <span className="text-xs text-muted-foreground font-normal">
                {unit}
              </span>
            )}
            <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground shrink-0 transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          align="center"
          className="w-72 p-3 bg-popover text-popover-foreground border shadow-lg rounded-xl z-50"
        >
          <div className="space-y-2.5 text-left font-sans">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="font-semibold text-xs text-foreground">
                General Entries
              </span>
              <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[120px]">
                {teamName}
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {generalEntries && generalEntries.length > 0 ? (
                generalEntries.map((e, idx) => (
                  <div
                    key={e.id ?? idx}
                    className="flex items-start justify-between text-xs py-0.5 gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {e.name}
                      </span>
                      {e.categoryName && (
                        <span className="text-[10px] text-muted-foreground">
                          {e.categoryName}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-mono font-semibold shrink-0 text-xs",
                        e.points >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {e.points >= 0 ? `+${e.points}` : e.points} pts
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-1">
                  General entries:{" "}
                  <span className="font-mono font-semibold">
                    {generalPoints > 0 ? `+${generalPoints}` : generalPoints}{" "}
                    pts
                  </span>
                </div>
              )}
            </div>

            <div className="border-t pt-2 space-y-1 text-xs font-mono bg-muted/40 -mx-3 -mb-3 p-2.5 rounded-b-xl">
              <div className="flex justify-between text-muted-foreground">
                <span>Actual Points:</span>
                <span>{basePoints} pts</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>General Entries:</span>
                <span
                  className={
                    generalPoints >= 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-rose-600 dark:text-rose-400 font-semibold"
                  }
                >
                  {generalPoints >= 0 ? `+${generalPoints}` : generalPoints} pts
                </span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1">
                <span>Total:</span>
                <span className="text-primary font-black">
                  {basePoints} {sign} {absGeneral} = {points} pts
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
