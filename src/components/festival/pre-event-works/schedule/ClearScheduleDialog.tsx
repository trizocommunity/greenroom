"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StageOption } from "./types";

export type ClearScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: (filters?: {
    stageId?: string;
    dateKey?: string;
  }) => Promise<unknown>;
  stages: StageOption[];
};

export function ClearScheduleDialog({
  open,
  onOpenChange,
  onClear,
  stages,
}: ClearScheduleDialogProps) {
  const [stageId, setStageId] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [clearing, setClearing] = useState(false);

  const reset = () => {
    setStageId("");
    setDateKey("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleConfirm = async () => {
    setClearing(true);
    try {
      const filters: { stageId?: string; dateKey?: string } = {};
      if (stageId && stageId !== "__all__") filters.stageId = stageId;
      if (dateKey) filters.dateKey = dateKey;
      await onClear(Object.keys(filters).length > 0 ? filters : undefined);
      reset();
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear Schedule</DialogTitle>
          <DialogDescription>
            Optionally filter which slots to remove. Leave both blank to clear
            all slots for this event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">Stage (optional)</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All stages</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Date (optional)</Label>
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              placeholder="dd-mm-yyyy"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={clearing}
            onClick={handleConfirm}
          >
            {clearing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Clearing…
              </>
            ) : (
              "Clear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
