"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatDateTime } from "@/core/datetime";
import type { ProgrammeHistoryDetail } from "./reporting-status";

/**
 * Renders the heavy history-drawer payload (status/category/code counts +
 * timeline + per-participant reported/spun timeline). Driven by the parent
 * passing an open detail; the parent owns the open-id state.
 */
export function ReportingHistoryDrawer({
  historyDetail,
  displayTz,
  onClose,
}: {
  historyDetail: ProgrammeHistoryDetail | null;
  displayTz: string;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(historyDetail)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <div className="overflow-y-auto p-4 sm:p-6">
          {historyDetail ? (
            <>
              <DrawerHeader className="px-0 pt-0">
                <DrawerTitle>{historyDetail.programmeName}</DrawerTitle>
                <DrawerDescription>
                  {historyDetail.stageName} • {historyDetail.startTimeLabel}
                </DrawerDescription>
              </DrawerHeader>
              <div className="space-y-2.5 sm:space-y-3 mt-5">
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

                <div className="pt-2">
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
                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                                      {index + 1}, {entry.label}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground flex gap-2">
                                      {entry.membersCount != null && (
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                          {entry.membersCount} Members
                                        </span>
                                      )}
                                      {entry.membersCount == null && (
                                        <span>{entry.chestOrTeam}</span>
                                      )}
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {entry.group}
                                      </span>
                                    </p>
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
                                          tz: displayTz,
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })
                                      : "—"}
                                  </p>
                                  <p>
                                    Spun/Issued:{" "}
                                    {entry.spunAt
                                      ? formatDateTime(entry.spunAt, {
                                          tz: displayTz,
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
            </>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
