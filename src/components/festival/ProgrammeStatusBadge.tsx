"use client";

import { Badge } from "@/components/ui/badge";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

export const STATUS_LABELS: Record<ProgrammeStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  REPORTING: "Reporting",
  PENDING_JUDGMENT: "Pending Judgment",
  JUDGING: "Judging",
  PENDING_PUBLICATION: "Pending Publication",
  PUBLISHED: "Published",
  ANNOUNCED: "Announced",
  CANCELLED: "Cancelled",
};

/**
 * Programme status color system (semantic, theme-aware):
 * - READY: muted (not started)
 * - ASSIGNED: slate/neutral (in progress)
 * - SCHEDULED: primary (confirmed)
 * - REPORTING / STARTED: amber (active / event day)
 * - ENDED: muted (phase complete)
 * - JUDGED: primary (results in)
 * - PUBLISHED: success green (final, live)
 */
const STATUS_STYLES: Record<ProgrammeStatus, string> = {
  DRAFT: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
  ASSIGNED: "border-transparent bg-muted text-muted-foreground",
  SCHEDULED:
    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  REPORTING: "border-transparent bg-warning/15 text-warning",
  PENDING_JUDGMENT: "border-transparent bg-warning/15 text-warning",
  JUDGING: "border-transparent bg-warning/15 text-warning",
  PENDING_PUBLICATION: "border-transparent bg-primary/15 text-primary",
  PUBLISHED: "border-transparent bg-success/15 text-success",
  ANNOUNCED: "border-transparent bg-success/15 text-success",
  CANCELLED: "border-transparent bg-destructive/15 text-destructive",
};

interface ProgrammeStatusBadgeProps {
  status: ProgrammeStatus;
  className?: string;
}

export function ProgrammeStatusBadge({
  status,
  className,
}: ProgrammeStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <Badge variant="outline" className={cn("rounded-full", style, className)}>
      {label}
    </Badge>
  );
}
