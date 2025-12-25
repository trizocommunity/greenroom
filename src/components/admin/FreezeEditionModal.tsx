"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { freezeEditionAdmin } from "@/server/actions/admin.actions";

interface FreezeEditionModalProps {
  editionId: string;
  editionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FreezeEditionModal({
  editionId,
  editionName,
  open,
  onOpenChange,
}: FreezeEditionModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleFreeze = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for freezing");
      return;
    }

    setLoading(true);
    try {
      const result = await freezeEditionAdmin(editionId, reason);
      if (result.success) {
        toast.success("Edition frozen successfully");
        onOpenChange(false);
        setReason("");
      } else {
        toast.error("Failed to freeze edition");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-red-900/50 bg-slate-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Freeze Edition
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to freeze <strong>{editionName}</strong>? This
            will prevent any further changes or signups for this edition.
            <br />
            <span className="text-xs text-red-400 font-semibold">
              This action requires a reason.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Freezing</Label>
            <Input
              id="reason"
              placeholder="e.g. Cancelled due to weather, Policy violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-900 border-slate-700 focus:border-red-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleFreeze}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Freezing...
              </>
            ) : (
              "Freeze Edition"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
