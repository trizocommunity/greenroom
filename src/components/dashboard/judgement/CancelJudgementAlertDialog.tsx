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

/**
 * Confirmation shown before abandoning an active judgement. Caller passes the
 * pending programmeId; on confirm the cancel action is fired.
 */
export function CancelJudgementAlertDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel judgement?</AlertDialogTitle>
          <AlertDialogDescription>
            This will abort the active judgement round and lock out all judges
            instantly. Any partial scores that have not been submitted will be
            lost. The programme will remain as Cancelled and can be restarted
            later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Keep active
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? "Cancelling..." : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
