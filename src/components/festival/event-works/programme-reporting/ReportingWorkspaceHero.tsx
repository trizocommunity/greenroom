"use client";

import { Loader2 } from "lucide-react";
import type { ReportingActiveAction } from "./useReportingActions";

/**
 * The big centered Start/Restart button shown in the pre-start phase. When
 * live, the square scanner takes this same central slot.
 */
export function ReportingWorkspaceHero({
  assignmentsCount,
  isTimedOut,
  isReset,
  sessionLocked,
  isPending,
  activeAction,
  onStart,
}: {
  assignmentsCount: number;
  isTimedOut: boolean;
  isReset: boolean;
  sessionLocked: boolean;
  isPending: boolean;
  activeAction: ReportingActiveAction;
  onStart: () => void;
}) {
  const hasAssignments = assignmentsCount > 0;
  const sessionStatusLabel = isTimedOut || isReset ? "RESET" : "";

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        type="button"
        onClick={onStart}
        disabled={
          isPending || activeAction != null || sessionLocked || !hasAssignments
        }
        className="flex h-40 w-40 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-lg font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeAction === "start" ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : sessionStatusLabel === "RESET" ? (
          "Restart"
        ) : (
          "Start"
        )}
      </button>
      {!hasAssignments ? (
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          No assignments yet — add participants in Pre Event Works first.
        </p>
      ) : null}
    </div>
  );
}
