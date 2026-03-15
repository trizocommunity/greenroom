"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type DerivedFestivalStatus,
  FESTIVAL_STATUS_LABELS,
} from "@/lib/festival-status";

interface FestivalStatusBadgeProps {
  status: DerivedFestivalStatus | string;
  expiresAt?: Date | string | null;
  size?: "sm" | "default";
}

const statusConfig: Record<
  DerivedFestivalStatus,
  { icon: typeof Clock; variant: "default" | "secondary" | "destructive"; className: string }
> = {
  READY: {
    icon: Clock,
    variant: "secondary",
    className: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  },
  ONGOING: {
    icon: CheckCircle,
    variant: "default",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  PAST: {
    icon: Calendar,
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  EXPIRED: {
    icon: AlertTriangle,
    variant: "destructive",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
};

export function FestivalStatusBadge({
  status,
  expiresAt,
  size = "default",
}: FestivalStatusBadgeProps) {
  const normalized = status as DerivedFestivalStatus;
  const isExpiredByTime = expiresAt ? new Date(expiresAt) < new Date() : false;

  if (normalized === "EXPIRED" || isExpiredByTime) {
    const config = statusConfig.EXPIRED;
    const Icon = config.icon;
    return (
      <Badge
        variant={config.variant}
        className={`${size === "sm" ? "text-xs px-1.5 py-0" : ""} ${config.className}`}
      >
        <Icon
          className={`${size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} mr-1`}
        />
        {FESTIVAL_STATUS_LABELS.EXPIRED}
      </Badge>
    );
  }

  const config = statusConfig[normalized] ?? statusConfig.READY;
  const Icon = config.icon;
  const label =
    FESTIVAL_STATUS_LABELS[normalized] ?? FESTIVAL_STATUS_LABELS.READY;

  return (
    <Badge
      variant={config.variant}
      className={`${size === "sm" ? "text-xs px-1.5 py-0" : ""} ${config.className}`}
    >
      <Icon
        className={`${size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} mr-1`}
      />
      {label}
    </Badge>
  );
}
