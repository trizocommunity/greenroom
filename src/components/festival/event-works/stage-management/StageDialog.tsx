"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createStage,
  updateStage,
} from "@/features/stages/actions/stage.actions";

interface StageDialogProps {
  festivalId: string;
  stageToEdit?: any; // or typed Stage
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StageDialog({
  festivalId,
  stageToEdit,
  open,
  onOpenChange,
  onSuccess,
}: StageDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (stageToEdit) {
        setName(stageToEdit.name);
        setDescription(stageToEdit.description || "");
      } else {
        setName("");
        setDescription("");
      }
    }
  }, [open, stageToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Stage name is required");
      return;
    }

    try {
      setIsLoading(true);
      if (stageToEdit) {
        await updateStage(stageToEdit.id, { name, description });
        toast.success("Stage updated successfully");
      } else {
        await createStage(festivalId, { name, description });
        toast.success("Stage created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save stage");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stageToEdit ? "Edit Stage" : "Create Stage"}
          </DialogTitle>
          <DialogDescription>
            {stageToEdit
              ? "Update the details of the stage."
              : "Add a new stage for the festival."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Stage Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Main Auditorium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g. Located effectively near the entrance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {stageToEdit ? "Update Stage" : "Create Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
