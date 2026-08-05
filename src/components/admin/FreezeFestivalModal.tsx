"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { freezeFestivalAdmin } from "@/features/admin/actions/admin.actions";
import { toast } from "@/lib/toast";

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Freeze Festival
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Are you sure you want to freeze <strong>{festivalName}</strong>?
            This will lock the festival and prevent any further updates by the
            owner.
            <br />
            <span className="text-xs text-destructive font-semibold">
              This action requires a reason.
            </span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Freezing</Label>
            <Input
              id="reason"
              placeholder="e.g. Terms of Service violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="focus:border-destructive"
            />
          </div>
        </div>
        <ResponsiveDialogFooter>
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
              "Freeze Festival"
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
