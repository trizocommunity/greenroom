"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface StageAssignmentOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface StageAssignmentToggleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  emptyMessage: string;
  options: StageAssignmentOption[];
  assignedIds: string[];
  pendingId: string | null;
  onToggle: (optionId: string, nextAssigned: boolean) => void;
}

export function StageAssignmentToggleDialog({
  open,
  onOpenChange,
  title,
  description,
  emptyMessage,
  options,
  assignedIds,
  pendingId,
  onToggle,
}: StageAssignmentToggleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {options.map((option) => {
              const isAssigned = assignedIds.includes(option.id);
              const isPending = pendingId === option.id;
              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id={`stage-assignment-${option.id}`}
                      checked={isAssigned}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        onToggle(option.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`stage-assignment-${option.id}`}
                      className="flex flex-col min-w-0 cursor-pointer"
                    >
                      <span className="font-medium truncate">
                        {option.label}
                      </span>
                      {option.sublabel ? (
                        <span className="text-xs text-muted-foreground truncate">
                          {option.sublabel}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
