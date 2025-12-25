"use client";

import { useState } from "react";
import { Snowflake } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { freezeEditionAdmin } from "@/server/actions/admin.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FreezeEditionButtonProps {
  editionId: string;
  editionName: string;
}

export function FreezeEditionButton({
  editionId,
  editionName,
}: FreezeEditionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const handleFreeze = async () => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    setLoading(true);
    try {
      await freezeEditionAdmin(editionId, reason);
      toast.success("Edition frozen successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to freeze edition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <Snowflake className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Force Freeze Edition</DialogTitle>
          <DialogDescription>
            Are you sure you want to freeze <strong>{editionName}</strong>? This
            action will make the edition read-only and cannot be easily undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Freezing</Label>
            <Input
              id="reason"
              placeholder="e.g. Policy Violation, Payment Dispute"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleFreeze} disabled={loading || !reason.trim()}>
            {loading ? "Freezing..." : "Confirm Freeze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
