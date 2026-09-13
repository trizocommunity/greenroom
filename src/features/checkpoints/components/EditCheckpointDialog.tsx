"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCheckpointAction } from "../actions/checkpoint.actions";

interface EditCheckpointDialogProps {
  festivalId: string;
  checkpoint: { id: string; name: string; requiresWindow: boolean };
}

export function EditCheckpointDialog({
  festivalId,
  checkpoint,
}: EditCheckpointDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(checkpoint.name);
  const [requiresWindow, setRequiresWindow] = useState(
    checkpoint.requiresWindow,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await updateCheckpointAction({
      festivalId,
      checkpointId: checkpoint.id,
      name: trimmed,
      requiresWindow,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || "Failed to update the checkpoint.");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(checkpoint.name);
          setRequiresWindow(checkpoint.requiresWindow);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Edit ${checkpoint.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit checkpoint</DialogTitle>
          <DialogDescription>
            Rename this checkpoint or change whether its sessions need a time
            window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`cp-name-${checkpoint.id}`}>Name</Label>
            <Input
              id={`cp-name-${checkpoint.id}`}
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`cp-window-${checkpoint.id}`}
              checked={requiresWindow}
              onCheckedChange={(v) => setRequiresWindow(v === true)}
            />
            <Label
              htmlFor={`cp-window-${checkpoint.id}`}
              className="text-sm font-normal"
            >
              Requires a time window (Food-style)
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
