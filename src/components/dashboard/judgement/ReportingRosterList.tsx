"use client";

import { Badge } from "@/components/ui/badge";
import { ParticipantNameBlock } from "@/components/shared/roster/ParticipantNameBlock";
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

  const groupNameEl = isGroup && entry.groupName && entry.groupName !== entry.label ? entry.groupName : null;
  const catNameEl = entry.categoryName && entry.categoryName !== programmeCategory ? entry.categoryName : null;
  
  const subtitle = [groupNameEl, catNameEl].filter(Boolean).join(" · ");

  return (
    <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
      <ParticipantNameBlock
        className="flex-1"
        primaryName={primary}
        isGroup={isGroup && !!entry.label}
        subtitle={subtitle || null}
        teamMemberNames={entry.teamMemberNames}
      />
      <div className="shrink-0 flex items-center">
        {entry.codeLetter ? (
          <Badge
            variant="outline"
            className="font-mono text-[10px] sm:text-xs px-2 py-0.5 border-primary/20 bg-primary/5 text-primary shadow-sm"
          >
            {entry.codeLetter}
          </Badge>
        ) : (
          <span className="text-muted-foreground/40 text-xs sm:text-sm">—</span>
        )}
      </div>
    </div>
  );
}
