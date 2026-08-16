"use client";

import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type {
  ReportingBoardItem,
  ProgrammeReportingAssignmentRow,
} from "./types";

interface LargeTimerDrawerProps {
  festivalId: string;
  item: ReportingBoardItem | null;
  assignments: ProgrammeReportingAssignmentRow[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LargeTimerDrawer({
  festivalId,
  item,
  assignments,
  isOpen,
  onOpenChange,
}: LargeTimerDrawerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const windowEndsAt = item?.reportingSession?.windowEndsAt
    ? typeof item.reportingSession.windowEndsAt === "string"
      ? parseInstant(item.reportingSession.windowEndsAt)
      : item.reportingSession.windowEndsAt
    : null;

  useEffect(() => {
    if (!isOpen || !windowEndsAt) return;

    const end = windowEndsAt.getTime();
    const update = () => {
      setTimeLeft(Math.max(0, end - Date.now()));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isOpen, windowEndsAt]);

  const isOver = timeLeft <= 0 && isOpen && windowEndsAt;

  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const reportedList = useMemo(() => {
    if (!item?.reportingSession) return [];

    const codesMap = new Map<string, string>();
    for (const cl of item.reportingSession.programmeCodeLetters) {
      for (const rec of cl.programmeCodeLetterRecipients) {
        codesMap.set(rec.participantId, cl.code);
      }
    }

    const assignmentsMap = new Map(assignments.map((a) => [a.id, a]));
    const isGroup = item.programme.type === "GROUP";

    const deduped = new Map<
      string,
      { id: string; name: string; code: string }
    >();

    for (const r of item.reportingSession.programmeReportedParticipants) {
      const assignment = assignmentsMap.get(r.assignmentId);

      let key = r.assignmentId;
      let name = assignment?.participantName || "Unknown";
      let firstParticipantId = assignment?.participantId;

      if (isGroup) {
        key = `${r.groupId ?? "no-group"}::${r.teamNumber ?? 0}`;
        const teamLabel =
          r.teamNumber && r.teamNumber > 0 ? `Party ${r.teamNumber}` : "Party";
        name = assignment?.teamLeadName
          ? `${assignment.teamLeadName} & ${teamLabel}`
          : teamLabel;
        firstParticipantId =
          assignment?.teamParticipantIds?.[0] || assignment?.participantId;
      }

      if (!deduped.has(key)) {
        const code = firstParticipantId
          ? codesMap.get(firstParticipantId) || "—"
          : "—";
        deduped.set(key, { id: key, name, code });
      }
    }

    return Array.from(deduped.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [item, assignments]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-8">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-xl">{item?.programme.name}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col items-center justify-center p-8">
          <div
            className={cn(
              "font-mono font-bold tracking-tighter transition-colors",
              isOver ? "text-red-500 animate-pulse" : "text-foreground",
            )}
            style={{ fontSize: "6rem", lineHeight: "1" }}
          >
            {isOver ? "00:00" : formatted}
          </div>

          {reportedList.length > 0 && (
            <div className="mt-8 w-full max-w-md">
              <h3 className="mb-2 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                Reported Participants (A-Z)
              </h3>
              <div className="space-y-1 overflow-y-auto max-h-[40vh] px-2">
                {reportedList.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex justify-between items-center bg-muted/20 px-2 py-1.5 rounded-sm"
                  >
                    <span className="font-medium text-xs truncate">
                      {participant.name}
                    </span>
                    <span className="font-bold text-sm text-primary tabular-nums">
                      {participant.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
