"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReportingBoardItem } from "./types";
import type {
  ReportingActions,
  ReportingActiveAction,
} from "./useReportingActions";
import type { ReportingSessionState } from "./useReportingSession";

export interface ReportingWorkspaceHeaderDerived {
  assignmentsWithReported: ReadonlyArray<{ id: string; isReported: boolean }>;
  reportedUnitsCount: number;
  allTilesRevealed: boolean;
}

/**
 * Programme title row + status badge + primary CTA (Complete checkout OR
 * Submit & notify) + the dropdown menu of bulk actions + the post-close /
 * post-timeout / post-reset footer notes.
 */
export function ReportingWorkspaceHeader({
  selected,
  session,
  actions,
  derived,
}: {
  selected: ReportingBoardItem;
  session: ReportingSessionState;
  actions: ReportingActions;
  derived: ReportingWorkspaceHeaderDerived;
}) {
  const programmeType = selected.programme?.type;
  const sessionLocked = Boolean(selected.reportingSession?.isLocked);
  const allMarked = derived.assignmentsWithReported.every((a) => a.isReported);
  const hasAssignments = derived.assignmentsWithReported.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex  gap-2 flex-row sm:flex-wrap sm:items-center justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <Badge
            variant={programmeType === "GROUP" ? "default" : "secondary"}
            className="text-[10px] uppercase"
          >
            {programmeType}
          </Badge>
          {session.isInProgress ? (
            <Badge className="gap-1 border-emerald-600/40 bg-emerald-600/15 text-emerald-800 dark:text-emerald-100">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </Badge>
          ) : session.isTimedOut ? (
            <Badge variant="secondary">Timed out</Badge>
          ) : session.isClosed ? (
            <Badge variant="secondary">Finished</Badge>
          ) : session.sessionStatus === "RESET" ? (
            <Badge variant="outline">Stopped</Badge>
          ) : (
            <Badge variant="outline">Ready</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.isInProgress ? (
            <>
              {session.wizardStep === "checkout" ? (
                <Button
                  size="sm"
                  className="rounded-lg font-semibold"
                  onClick={actions.onCompleteCheckout}
                  title={
                    derived.reportedUnitsCount === 0
                      ? "Check out at least one participant/team before drawing codes."
                      : "Freezes attendance and deals the code letters."
                  }
                  disabled={
                    actions.isPending ||
                    actions.activeAction != null ||
                    !selected.reportingSession?.id ||
                    sessionLocked ||
                    !session.isInProgress ||
                    !hasAssignments ||
                    derived.reportedUnitsCount === 0
                  }
                >
                  {actions.activeAction === "complete-checkout" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing draw…
                    </span>
                  ) : (
                    "Complete checkout"
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-lg font-semibold"
                  onClick={actions.onClose}
                  title={
                    !derived.allTilesRevealed
                      ? "Every code letter must be drawn before submitting."
                      : undefined
                  }
                  disabled={
                    actions.isPending ||
                    actions.activeAction != null ||
                    session.isRevealing ||
                    !selected.reportingSession?.id ||
                    sessionLocked ||
                    !session.isInProgress ||
                    !derived.allTilesRevealed
                  }
                >
                  {actions.activeAction === "close" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit & notify"
                  )}
                </Button>
              )}
              <BulkActionsMenu
                activeAction={actions.activeAction}
                isPending={actions.isPending}
                isRevealing={session.isRevealing}
                wizardStep={session.wizardStep}
                sessionLocked={sessionLocked}
                isInProgress={session.isInProgress}
                allMarked={allMarked}
                hasAssignments={hasAssignments}
                allTilesRevealed={derived.allTilesRevealed}
                onMarkAllPresent={() =>
                  actions.onMarkAllPresent(
                    derived.assignmentsWithReported.map((a) => a.id),
                  )
                }
                onRevealAll={actions.onRevealAllRemaining}
                onReset={actions.onReset}
              />
            </>
          ) : null}
          {session.isClosed ? (
            <Button
              variant="destructive"
              onClick={() => session.setIsReopenConfirmOpen(true)}
              disabled={
                actions.isPending ||
                actions.activeAction != null ||
                !selected.reportingSession?.id
              }
            >
              Reopen reporting
            </Button>
          ) : null}
        </div>
      </div>

      {session.isClosed ? (
        <p className="text-xs text-muted-foreground">
          {programmeType === "GROUP"
            ? "One code letter per reported team; notifications sent."
            : "Codes issued; notifications sent."}
        </p>
      ) : null}
      {session.isTimedOut ? (
        <p className="text-xs text-muted-foreground">
          Window ended — restart to continue.
        </p>
      ) : null}
      {session.isReset ? (
        <p className="text-xs text-muted-foreground">
          Stopped with no codes — restart to try again.
        </p>
      ) : null}
    </div>
  );
}

function BulkActionsMenu({
  activeAction,
  isPending,
  isRevealing,
  wizardStep,
  sessionLocked,
  isInProgress,
  allMarked,
  hasAssignments,
  allTilesRevealed,
  onMarkAllPresent,
  onRevealAll,
  onReset,
}: {
  activeAction: ReportingActiveAction;
  isPending: boolean;
  isRevealing: boolean;
  wizardStep: ReportingSessionState["wizardStep"];
  sessionLocked: boolean;
  isInProgress: boolean;
  allMarked: boolean;
  hasAssignments: boolean;
  allTilesRevealed: boolean;
  onMarkAllPresent: () => void;
  onRevealAll: () => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-label="More reporting actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          disabled={
            isPending ||
            activeAction === "mark" ||
            wizardStep === "scratch" ||
            sessionLocked ||
            !isInProgress ||
            !hasAssignments ||
            allMarked
          }
          onClick={onMarkAllPresent}
        >
          Mark all present
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={
            isPending ||
            activeAction === "reveal-all" ||
            isRevealing ||
            sessionLocked ||
            !isInProgress ||
            wizardStep !== "scratch" ||
            allTilesRevealed
          }
          onClick={onRevealAll}
        >
          {activeAction === "reveal-all"
            ? "Revealing…"
            : "Reveal remaining codes"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={isPending || activeAction === "reset" || sessionLocked}
          onClick={onReset}
        >
          Stop and clear the draw
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
