"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteSessionAction } from "../actions/checkpoint.actions";

interface DeleteSessionDialogProps {
  festivalId: string;
  session: { id: string; name: string; scannedCount: number };
  onDeleted: () => void;
}

export function DeleteSessionDialog({
  festivalId,
  session,
  onDeleted,
}: DeleteSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanLabel =
    session.scannedCount > 0
      ? ` and its ${session.scannedCount} scan${
          session.scannedCount === 1 ? "" : "s"
        }`
      : "";

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    const res = await deleteSessionAction({
      festivalId,
      sessionId: session.id,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || "Failed to delete the session.");
      return;
    }
    setOpen(false);
    onDeleted();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete session ${session.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{session.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the session{scanLabel}. This can't be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
