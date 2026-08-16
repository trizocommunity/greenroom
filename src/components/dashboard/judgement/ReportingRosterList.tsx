"use client";

import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Programme, ReportingDetails, ReportedEntry } from "./types";

/**
 * Compact read-only list of who's on stage inside the start-judgement
 * drawer. Group programmes render as "Teamlead & Party" with the group name
 * underneath, matching the convention used in the participants drawer and
 * the reporting roster.
 */
export function ReportingRosterList({
  programme,
  details,
}: {
  programme: Programme;
  details: ReportingDetails;
}) {
  if (details.reportedEntries.length === 0) {
    return (
      <div className="text-center p-4 bg-background rounded-md border border-dashed">
        <p className="text-xs text-muted-foreground">
          No participants reported yet.
        </p>
      </div>
    );
  }

  const isGroup = programme.programmeType === "GROUP";

  return (
    <div className="bg-background rounded-md border shadow-sm divide-y overflow-y-auto max-h-[300px]">
      {details.reportedEntries.map((entry, idx) => (
        <RosterRow
          key={`${entry.label}-${idx}`}
          entry={entry}
          programmeCategory={programme.programmeCategory ?? null}
          isGroup={isGroup}
        />
      ))}
    </div>
  );
}

function RosterRow({
  entry,
  programmeCategory,
  isGroup,
}: {
  entry: ReportedEntry;
  programmeCategory: string | null;
  isGroup: boolean;
}) {
  const teamNo = entry.teamNumber;
  const partySuffix =
    isGroup && teamNo && teamNo > 0 ? `Party ${teamNo}` : "Party";
  const primary = isGroup
    ? `${entry.label ?? "Party"} & ${partySuffix}`
    : entry.label;

  return (
    <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-medium text-xs sm:text-sm text-foreground">
          {isGroup && entry.label ? (
            <Crown className="h-3 w-3 shrink-0 text-primary" />
          ) : null}
          <span className="truncate">{primary}</span>
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
          {isGroup && entry.groupName && entry.groupName !== entry.label && (
            <span className="truncate max-w-[120px]">{entry.groupName}</span>
          )}
          {entry.categoryName && entry.categoryName !== programmeCategory && (
            <>
              {isGroup && entry.label !== entry.groupName && <span>·</span>}
              <span className="truncate max-w-[120px]">
                {entry.categoryName}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center">
        {entry.codeLetter ? (
          <Badge
            variant="outline"
            className="font-mono text-[10px] sm:text-xs px-2 py-0.5 border-primary/20 bg-primary/5 text-primary shadow-sm"
          >
            {entry.codeLetter}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground italic mr-2">
            No code
          </span>
        )}
      </div>
    </div>
  );
}
