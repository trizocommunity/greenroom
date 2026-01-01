"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { freezeFestivalAdmin } from "@/server/actions/admin.actions";

interface FreezeFestivalModalProps {
  festivalId: string;
  festivalName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FreezeFestivalModal({
  festivalId,
  festivalName,
  open,
  onOpenChange,
}: FreezeFestivalModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleFreeze = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for freezing");
      return;
    }

    setLoading(true);
    try {
      const result = await freezeFestivalAdmin(festivalId, reason);
      if (result.success) {
        toast.success("Festival frozen successfully");
        onOpenChange(false);
        setReason("");
      } else {
        toast.error("Failed to freeze festival");
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
      <DialogContent className="sm:max-w-md border-purple-900/50 bg-slate-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-500">
            <AlertTriangle className="h-5 w-5" />
            Freeze Festival
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to freeze <strong>{festivalName}</strong>?
            This will lock the festival and prevent any further updates by the
            owner.
            <br />
            <span className="text-xs text-purple-400 font-semibold">
              This action requires a reason.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Freezing</Label>
            <Input
              id="reason"
              placeholder="e.g. Terms of Service violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-900 border-slate-700 focus:border-purple-500"
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
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleFreeze}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Freezing...
              </>
            ) : (
              "Freeze Festival"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
