"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/core/utils/cn";
import { ReportingCheckoutStep } from "./ReportingCheckoutStep";
import { ReportingReopenDialog } from "./ReportingReopenDialog";
import { ReportingRosterSection } from "./ReportingRosterSection";
import { ReportingScratchStep } from "./ReportingScratchStep";
import { ReportingWorkspaceHeader } from "./ReportingWorkspaceHeader";
import { ReportingWorkspaceHero } from "./ReportingWorkspaceHero";
import type { ReportingBoardItem, RosterTableRow, ScratchTile } from "./types";
import type { ReportingActions } from "./useReportingActions";
import type { ReportingSessionState } from "./useReportingSession";

export interface ReportingWorkspaceDerived {
  assignmentsWithReported: ReadonlyArray<{ id: string; isReported: boolean }>;
  rosterTableRows: RosterTableRow[];
  reportedUnitsCount: number;
  allTilesRevealed: boolean;
  scratchTiles: ScratchTile[];
  currentQueuePosition: number | null;
  getIssuedCodeForRow: (row: RosterTableRow) => string | null;
}

/**
 * Right-half sheet that hosts the open programme's reporting flow. Renders a
 * brief skeleton on first mount, an empty state when nothing is selected,
 * and fades content out for ~300ms when switching between entries so the
 * children don't visibly flicker.
 */
export function ReportingWorkspace({
  festivalId,
  selected,
  derived,
  actions,
  session,
  refreshBoard,
}: {
  festivalId: string;
  selected: ReportingBoardItem | null;
  derived: ReportingWorkspaceDerived;
  actions: ReportingActions;
  session: ReportingSessionState;
  refreshBoard: () => void;
}) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setIsInitialLoading(false), 250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Sheet
      open={Boolean(session.selectedEntryId)}
      onOpenChange={(open) => {
        if (!open) session.closeDetail();
      }}
    >
      <SheetContent
        ref={actions.confettiRef}
        className="w-full gap-0 overflow-hidden p-0 sm:w-1/2 sm:min-w-[560px] sm:max-w-none"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/40 px-4 py-3 text-left sm:px-6">
          <SheetTitle className="flex items-center justify-between gap-2 text-lg">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate">
                {selected?.programme?.name || "Programme"}
              </span>
              {selected?.programme?.category?.name ? (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {selected.programme.category.name}
                </Badge>
              ) : null}
              {selected?.reportingSession?.isLocked && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Locked
                </Badge>
              )}
            </div>
            {selected?.stage?.name ? (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {selected.stage.name}
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>
        <div
          className={cn(
            "flex-1 space-y-6 overflow-y-auto px-4 py-4 transition-opacity duration-300 sm:px-6",
            session.isEntrySwitching ? "opacity-0" : "opacity-100",
          )}
        >
          {isInitialLoading ? (
            <WorkspaceSkeleton />
          ) : !selected ? (
            <WorkspaceEmpty />
          ) : (
            <>
              <ReportingWorkspaceHeader
                selected={selected}
                session={session}
                actions={actions}
                derived={derived}
              />

              {session.isPreStart ? (
                <ReportingWorkspaceHero
                  assignmentsCount={derived.assignmentsWithReported.length}
                  isTimedOut={session.isTimedOut}
                  isReset={session.isReset}
                  sessionLocked={Boolean(selected.reportingSession?.isLocked)}
                  isPending={actions.isPending}
                  activeAction={actions.activeAction}
                  onStart={actions.onStart}
                />
              ) : null}

              {session.isInProgress && session.wizardStep === "checkout" ? (
                <ReportingCheckoutStep
                  festivalId={festivalId}
                  selected={selected}
                  session={session}
                  recentScans={session.recentScans}
                  refreshBoard={refreshBoard}
                />
              ) : null}

              {session.isInProgress && session.wizardStep === "scratch" ? (
                <ReportingScratchStep
                  scratchTiles={derived.scratchTiles}
                  currentQueuePosition={derived.currentQueuePosition}
                  isRevealing={session.isRevealing}
                  activeAction={actions.activeAction}
                  onScratch={actions.onScratchTile}
                  onRevealAll={actions.onRevealAllRemaining}
                />
              ) : null}

              {selected.programme ? (
                <ReportingRosterSection
                  festivalId={festivalId}
                  selected={selected}
                  session={session}
                  derived={derived}
                  actions={actions}
                />
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
      <ReportingReopenDialog
        open={session.isReopenConfirmOpen}
        activeAction={actions.activeAction}
        onOpenChange={session.setIsReopenConfirmOpen}
        onConfirm={actions.onReopen}
      />
    </Sheet>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded-md bg-muted/60" />
      <div className="h-20 animate-pulse rounded-md bg-muted/60" />
      <div className="h-10 w-36 animate-pulse rounded bg-muted" />
    </div>
  );
}

function WorkspaceEmpty() {
  return (
    <div className="py-20 text-center space-y-3">
      <div className="p-3 rounded-full bg-muted w-fit mx-auto">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Pick a programme from the queue to run its reporting here.
      </p>
    </div>
  );
}
