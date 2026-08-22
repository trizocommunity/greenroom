"use client";

import { useEffect, useMemo, useState } from "react";
import { ParticipantNameBlock } from "@/components/shared/roster/ParticipantNameBlock";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatDateTime, parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { reportedEntriesFromReportedRows } from "@/features/programmes/domain/reported-entries";
import {
  ReportedEntriesPanel,
  type ReportedEntry,
} from "./ReportedEntriesPanel";
import type { ProgrammeHistoryDetail } from "./reporting-status";
import type { ReportingBoardItem } from "./types";

interface LargeTimerDrawerProps {
  festivalId: string;
  item: ReportingBoardItem | null;
  assignments: ProgrammeReportingAssignmentRow[];
  historyDetail: ProgrammeHistoryDetail | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LargeTimerDrawer({
  festivalId: _festivalId,
  item,
  assignments,
  historyDetail,
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
      <DrawerContent className="pb-0">
        <div className="overflow-y-auto pb-8">
          <DrawerHeader className="text-center">
            <DrawerTitle className="text-xl">
              {item?.programme.name}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col items-center justify-center p-8 pt-0">
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

            {historyDetail && (
              <div className="mt-12 w-full max-w-3xl space-y-2.5 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Status
                    </p>
                    <p className="text-xs font-semibold">
                      {historyDetail.statusLabel}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Type
                    </p>
                    <p className="text-xs font-semibold">
                      {historyDetail.type}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Category
                    </p>
                    <p className="text-xs font-semibold">
                      {historyDetail.categoryName}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {historyDetail.type === "GROUP"
                        ? "Teams reported"
                        : "Reported"}
                    </p>
                    <p className="text-xs font-semibold">
                      {historyDetail.reportedCount}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {historyDetail.type === "GROUP" ? "Team codes" : "Codes"}
                    </p>
                    <p className="text-xs font-semibold">
                      {historyDetail.codeCount}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-left">
                  <div className="mb-4 flex items-center justify-between border-b pb-2">
                    <p className="text-sm font-semibold tracking-tight">
                      Timeline events
                    </p>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {historyDetail.timeline.length +
                        historyDetail.participantTimeline.length}{" "}
                      total
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Reporting timeline
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {historyDetail.timeline.map((step, index) => (
                          <div
                            key={`${step.title}-${index}`}
                            className="rounded-md border border-border/70 bg-linear-to-br from-background via-background to-muted/30 px-2.5 py-2"
                          >
                            <div className="flex items-start gap-2">
                              <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-purple/40 bg-purple/10 text-[9px] font-semibold text-purple">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                                  {step.title}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {step.at}
                                </p>
                                {step.note ? (
                                  <p className="text-[10px] text-muted-foreground/90">
                                    {step.note}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {historyDetail.type === "GROUP"
                          ? "Team reported timeline"
                          : "Participant reported timeline"}
                      </p>
                      {historyDetail.participantTimeline.length ? (
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {historyDetail.participantTimeline.map(
                            (entry, index) => (
                              <div
                                key={entry.key}
                                className="rounded-md border border-border/70 bg-background/70 px-2.5 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1 flex gap-2">
                                    <span className="text-xs font-semibold mt-[2px]">
                                      {index + 1}.
                                    </span>
                                    <ParticipantNameBlock
                                      className="flex-1"
                                      primaryName={
                                        historyDetail.type === "GROUP"
                                          ? entry.label
                                          : entry.label
                                      }
                                      isGroup={historyDetail.type === "GROUP"}
                                      subtitle={
                                        historyDetail.type === "GROUP"
                                          ? `${entry.group} · ${entry.chestOrTeam}`
                                          : entry.group
                                      }
                                      teamMemberNames={entry.teamMemberNames}
                                    />
                                  </div>
                                  <span className="rounded border bg-purple/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple">
                                    {entry.code}
                                  </span>
                                </div>
                                <div className="mt-1 grid gap-1 text-[10px] text-muted-foreground">
                                  <p>
                                    Reported:{" "}
                                    {entry.reportedAt
                                      ? formatDateTime(entry.reportedAt, {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })
                                      : "—"}
                                  </p>
                                  <p>
                                    Spun/Issued:{" "}
                                    {entry.spunAt
                                      ? formatDateTime(entry.spunAt, {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })
                                      : "Pending"}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          No reported entries captured for this session.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
