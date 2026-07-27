"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";
import {
  type DerivedFestivalStatus,
  FESTIVAL_STATUS_LABELS,
  formatFestivalDateDDMMYY,
  getFestivalStatusCountdownText,
} from "@/features/festivals/services/festival-status.service";

interface FestivalStatusBadgeProps {
  status: DerivedFestivalStatus | string;
  createdAt?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  expiresAt?: Date | string | null;
  size?: "sm" | "default";
  interactive?: boolean;
}

const statusConfig: Record<
  DerivedFestivalStatus,
  {
    icon: typeof Clock;
    variant: "default" | "secondary" | "destructive";
    className: string;
  }
> = {
  READY: {
    icon: Clock,
    variant: "secondary",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
  },
  ONGOING: {
    icon: CheckCircle,
    variant: "default",
    className:
      "bg-success/10 text-success border-success/20 hover:bg-success/10",
  },
  PAST: {
    icon: Calendar,
    variant: "secondary",
    className:
      "bg-warning/10 text-warning border-warning/20 hover:bg-warning/10",
  },
  EXPIRED: {
    icon: AlertTriangle,
    variant: "destructive",
    className:
      "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
  },
};

export function FestivalStatusBadge({
  status,
  createdAt,
  startDate,
  endDate,
  expiresAt,
  size = "default",
  interactive = false,
}: FestivalStatusBadgeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const normalized = status as DerivedFestivalStatus;

  // Use a stable value for SSR, only check live time on client
  const isExpiredByTime =
    mounted && expiresAt ? new Date(expiresAt) < new Date() : false;

  const effectiveStatus: DerivedFestivalStatus =
    normalized === "EXPIRED" || isExpiredByTime ? "EXPIRED" : normalized;

  const countdown = mounted
    ? getFestivalStatusCountdownText(effectiveStatus, {
        startDate,
        endDate,
        expiresAt,
      })
    : null;

  const badgeSizeClass = size === "sm" ? "text-xs px-1.5 py-0" : "";
  const iconSizeClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  const renderBadge = () => {
    const config = statusConfig[effectiveStatus] ?? statusConfig.READY;
    const Icon = config.icon;
    const label =
      FESTIVAL_STATUS_LABELS[effectiveStatus] ?? FESTIVAL_STATUS_LABELS.READY;
    return (
      <Badge
        variant={config.variant}
        className={`${badgeSizeClass} ${config.className}`}
      >
        <Icon className={`${iconSizeClass} mr-1`} />
        <span>{label}</span>
        {countdown ? (
          <span className="ml-1.5 border-l border-current/20 pl-1.5 opacity-90">
            {countdown}
          </span>
        ) : null}
      </Badge>
    );
  };

  if (!interactive) return renderBadge();

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent",
        )}
      >
        {renderBadge()}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Festival timeline</div>
            {renderBadge()}
          </div>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <span className="text-muted-foreground">
                Ready (create festival)
              </span>
              <span className="font-medium">
                {formatFestivalDateDDMMYY(createdAt)}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium">
                {formatFestivalDateDDMMYY(startDate)}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <span className="text-muted-foreground">End</span>
              <span className="font-medium">
                {formatFestivalDateDDMMYY(endDate)}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <span className="text-muted-foreground">Expire</span>
              <span className="font-medium">
                {formatFestivalDateDDMMYY(expiresAt)}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
