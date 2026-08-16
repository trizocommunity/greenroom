"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { reportedEntriesFromReportedRows } from "@/features/programmes/domain/reported-entries";
import {
  ReportedEntriesPanel,
  type ReportedEntry,
} from "./ReportedEntriesPanel";
import type { ReportingBoardItem } from "./types";

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

  const reportedEntries = useMemo<ReportedEntry[]>(() => {
    if (!item?.reportingSession) return [];

    const codesByParticipantId = new Map<string, string>();
    for (const cl of item.reportingSession.programmeCodeLetters) {
      for (const rec of cl.programmeCodeLetterRecipients) {
        codesByParticipantId.set(rec.participantId, cl.code);
      }
    }

    return reportedEntriesFromReportedRows({
      programmeType: item.programme.type,
      reportedRows: item.reportingSession.programmeReportedParticipants,
      assignments,
      codesByParticipantId,
    });
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

          <div className="mt-8 w-full max-w-md">
            <ReportedEntriesPanel entries={reportedEntries} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
