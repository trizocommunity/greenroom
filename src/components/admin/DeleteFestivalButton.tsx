"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useDeleteFestival } from "@/api/client/festivals";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteFestivalButtonProps {
  festivalId: string;
  festivalName: string;
  asMenuItem?: boolean;
}

export function DeleteFestivalButton({
  festivalId,
  festivalName,
  asMenuItem,
}: DeleteFestivalButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();
  const deleteFestival = useDeleteFestival();

  const Trigger = asMenuItem ? (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
      className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete Festival
    </DropdownMenuItem>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (confirmation !== festivalName) {
      toast.error("Confirmation name mismatch");
      return;
    }

    try {
      await deleteFestival.mutateAsync({
        id: festivalId,
        reason: reason.trim(),
      });
      toast.success("Festival deleted successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete festival");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            DANGER: Delete Festival
          </DialogTitle>
          <DialogDescription>
            You are about to irreversibly delete <strong>{festivalName}</strong>
            . This will delete all associated Payments, Participants, and data.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This action cannot be undone. This is a hard delete from the
            database.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Deletion</Label>
            <Input
              id="reason"
              placeholder="e.g. Terms Violation (Ticket #123)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">
              Type <strong>{festivalName}</strong> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={festivalName}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              deleteFestival.isPending ||
              !reason.trim() ||
              confirmation !== festivalName
            }
          >
            {deleteFestival.isPending ? "Deleting..." : "Delete Festival"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
