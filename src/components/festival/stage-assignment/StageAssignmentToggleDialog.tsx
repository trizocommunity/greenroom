"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/core/utils/cn";

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {options.map((option) => {
              const isAssigned = assignedIds.includes(option.id);
              const isPending = pendingId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(option.id, !isAssigned)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isAssigned
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card",
                    isPending && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold truncate">
                        {option.label}
                      </span>
                      {option.sublabel ? (
                        <span className="text-sm text-muted-foreground truncate mt-0.5">
                          {option.sublabel}
                        </span>
                      ) : null}
                    </div>
                    {isAssigned && !isPending && (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    )}
                  </div>
                  {isPending ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px]">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
