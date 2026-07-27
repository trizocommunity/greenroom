"use client";

import { ChevronDown, ChevronUp, ScanLine } from "lucide-react";
import { cn } from "@/core/utils/cn";

export function ReportingQuickAddSection({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 text-sm shadow-sm">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
        )}
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple/15 text-purple">
          <ScanLine className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="font-semibold text-foreground">
            Quick add to roster
          </span>
          <span className="text-muted-foreground ml-1 text-[11px] font-normal sm:ml-1.5">
            Chest # · QR photo · camera
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t border-border/80 bg-background/60 px-3 py-2.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
