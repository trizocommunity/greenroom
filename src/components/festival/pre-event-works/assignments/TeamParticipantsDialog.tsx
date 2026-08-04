"use client";

import { Crown } from "lucide-react";
import { StatusPill } from "@/components/app/AppSection";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export interface TeamParticipantRow {
  id: string;
  name: string;
  chestNumber?: string | null;
  categoryName?: string;
}

interface TeamParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeName: string;
  teamLabel: string;
  groupName: string;
  participants: TeamParticipantRow[];
  /** PRO only; null when the tier has no team leads or none is appointed. */
  teamLeadParticipantId?: string | null;
}

export function TeamParticipantsDialog({
  open,
  onOpenChange,
  programmeName,
  teamLabel,
  groupName,
  participants,
  teamLeadParticipantId = null,
}: TeamParticipantsDialogProps) {
  const lead = participants.find((p) => p.id === teamLeadParticipantId) ?? null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold tracking-tight text-heading">
            {teamLabel}
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            {programmeName} · {groupName} · {participants.length} member
            {participants.length === 1 ? "" : "s"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {lead && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Crown className="h-3 w-3 text-primary" />
              Team lead:{" "}
              <span className="font-medium text-heading">{lead.name}</span>
            </p>
          )}

          {participants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No participants in this team.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {participants.map((s) => {
                const isLead = s.id === teamLeadParticipantId;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {s.chestNumber ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                      {s.name}
                    </span>
                    {isLead && (
                      <StatusPill
                        tone="ready"
                        icon={Crown}
                        className="shrink-0"
                      >
                        Lead
                      </StatusPill>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
