"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { deleteCheckpointAction } from "../actions/checkpoint.actions";

interface DeleteCheckpointDialogProps {
  festivalId: string;
  checkpoint: { id: string; name: string; sessionCount: number };
}

export function DeleteCheckpointDialog({
  festivalId,
  checkpoint,
}: DeleteCheckpointDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSessions = checkpoint.sessionCount > 0;
  const sessionLabel = `${checkpoint.sessionCount} session${
    checkpoint.sessionCount === 1 ? "" : "s"
  }`;
  const canDelete = !hasSessions || confirmed;

  const handleDelete = async () => {
    if (!canDelete) return;
    setSubmitting(true);
    setError(null);
    const res = await deleteCheckpointAction({
      festivalId,
      checkpointId: checkpoint.id,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || "Failed to delete the checkpoint.");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setConfirmed(false);
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${checkpoint.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{checkpoint.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasSessions
              ? `This permanently deletes ${sessionLabel} and all their scans. This can't be undone.`
              : "This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasSessions && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Checkbox
              id={`cp-del-${checkpoint.id}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor={`cp-del-${checkpoint.id}`}
              className="text-sm font-normal leading-snug"
            >
              Yes, delete this checkpoint and its {sessionLabel}.
            </Label>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
