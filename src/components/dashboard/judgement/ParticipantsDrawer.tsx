"use client";

import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { ParticipantsViewState } from "./types";

/**
 * Drawer opened from a judgement-started card so the manager can see who's
 * on stage. GROUP programmes render "Teamlead & Party N" with the team name
 * underneath; INDIVIDUAL programmes render the participant label directly.
 */
export function ParticipantsDrawer({
  view,
  onClose,
}: {
  view: ParticipantsViewState | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(view)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{view?.programmeName}</DrawerTitle>
          <DrawerDescription>
            {view?.programmeType === "GROUP"
              ? "Reported teams on stage"
              : "Reported participants on stage"}
            {view?.details.stageName ? ` · ${view.details.stageName}` : ""}
          </DrawerDescription>
        </DrawerHeader>

        {view ? (
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                {view.programmeType === "GROUP" ? "Team" : "Participant"}
              </span>
              <span>Code</span>
            </div>
            {view.details.reportedEntries.length === 0 ? (
              <p className="rounded-md border bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                No one is on stage yet.
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
                {view.details.reportedEntries.map((entry, idx) => (
                  <ParticipantRow
                    key={`${entry.label}-${idx}`}
                    entry={entry}
                    programmeCategory={view.programmeCategory}
                    isGroup={view.programmeType === "GROUP"}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ParticipantRow({
  entry,
  programmeCategory,
  isGroup,
}: {
  entry: ParticipantsViewState["details"]["reportedEntries"][number];
  programmeCategory: string | null;
  isGroup: boolean;
}) {
  const teamNo = entry.teamNumber;
  const partySuffix =
    isGroup && teamNo && teamNo > 0 ? `Party ${teamNo}` : "Party";
  const teamLeadName = isGroup ? entry.label : null;
  const primary = isGroup
    ? `${teamLeadName ?? entry.groupName ?? "Party"} & ${partySuffix}`
    : entry.label;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-medium text-foreground">
          {isGroup && teamLeadName ? (
            <Crown className="h-3 w-3 shrink-0 text-primary" />
          ) : null}
          <span className="truncate">{primary}</span>
        </p>
        {isGroup && entry.groupName ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {entry.groupName}
          </p>
        ) : null}
        {entry.categoryName && entry.categoryName !== programmeCategory ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {entry.categoryName}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        {entry.codeLetter ? (
          <Badge
            variant="outline"
            className="font-mono text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary shadow-sm"
          >
            {entry.codeLetter}
          </Badge>
        ) : (
          <span className="text-[10px] italic text-muted-foreground">
            No code
          </span>
        )}
      </div>
    </div>
  );
}
