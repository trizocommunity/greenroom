"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type DerivedFestivalStatus,
  FESTIVAL_STATUS_LABELS,
  formatFestivalDateDDMMYY,
  getFestivalStatusCountdownText,
} from "@/lib/festival-status";

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
    className:
      "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  },
  ONGOING: {
    icon: CheckCircle,
    variant: "default",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  PAST: {
    icon: Calendar,
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  EXPIRED: {
    icon: AlertTriangle,
    variant: "destructive",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
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
  const normalized = status as DerivedFestivalStatus;
  const isExpiredByTime = expiresAt ? new Date(expiresAt) < new Date() : false;
  const effectiveStatus: DerivedFestivalStatus =
    normalized === "EXPIRED" || isExpiredByTime ? "EXPIRED" : normalized;
  const countdown = getFestivalStatusCountdownText(effectiveStatus, {
    startDate,
    endDate,
    expiresAt,
  });

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
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent"
        >
          {renderBadge()}
        </Button>
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
