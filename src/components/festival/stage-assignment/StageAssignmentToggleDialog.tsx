"use client";

import { CheckCircle2, Loader2, User } from "lucide-react";
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
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
                    "relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isAssigned
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                      : "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/50",
                    isPending && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                      isAssigned
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border",
                    )}
                  >
                    <User className="h-4 w-4" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                      {option.label}
                    </span>
                    {option.sublabel ? (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {option.sublabel}
                      </span>
                    ) : null}
                  </div>

                  {isAssigned && !isPending && (
                    <div className="shrink-0 flex items-center text-primary">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {isPending ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
