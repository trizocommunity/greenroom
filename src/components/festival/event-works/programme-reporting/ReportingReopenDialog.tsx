"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReportingActiveAction } from "./useReportingActions";

/**
 * Confirmation dialog for reopening a closed reporting session. The button
 * stays disabled while the action is in flight so the user can't double-fire.
 */
export function ReportingReopenDialog({
  open,
  activeAction,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  activeAction: ReportingActiveAction;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const inFlight = activeAction === "reopen";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen closed reporting?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears reported attendance, code letters, and all marks for
            this programme. Open judge links are invalidated and you must run
            reporting again before judging.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={inFlight}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={inFlight}
          >
            {inFlight ? "Reopening..." : "Reopen and clear data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
