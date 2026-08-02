"use client";

import { addDays, differenceInDays } from "date-fns";
import { LayoutDashboard, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import type { Festival } from "@/api/contracts/festivals";
import {
  AppPanel,
  Meter,
  StatusPill,
  type StatusTone,
} from "@/components/app/AppSection";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Button } from "@/components/ui/button";
import { getFestivalDurationDays } from "@/config/pricing";
import { formatDate, parseInstant } from "@/core/datetime";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
}

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  EXPIRED: { label: "Expired", tone: "danger" },
  ONGOING: { label: "Ongoing", tone: "live" },
  PAST: { label: "Past", tone: "warning" },
  READY: { label: "Ready", tone: "ready" },
};

/**
 * The owner's single festival, as the one panel on the profile overview —
 * this is the page's subject, so it keeps a bounded surface while everything
 * around it is a hairline list.
 */
export function FestivalCard({ festival, onEdit }: FestivalCardProps) {
  const status = getDerivedFestivalStatus({
    status: festival.status,
    startDate: festival.startDate,
    endDate: festival.endDate,
    expiresAt: festival.expiresAt,
  });
  const isLocked = festival.isLocked;
  const isExpired = status === "EXPIRED";
  const isPast = status === "PAST";
  const isActive = !isExpired && (status === "ONGOING" || status === "READY");

  const totalDays = getFestivalDurationDays();
  const displayTz = useDisplayTimezone();
  const createdAt = parseInstant(festival.createdAt) ?? new Date(NaN);
  const expiresAt = festival.expiresAt
    ? (parseInstant(festival.expiresAt) ?? addDays(createdAt, totalDays))
    : addDays(createdAt, totalDays);

  const daysPassed = Math.max(0, differenceInDays(new Date(), createdAt));
  const daysRemaining = Math.max(0, differenceInDays(expiresAt, new Date()));
  const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
  const isEndingSoon = daysRemaining <= 7;

  const statusMeta = STATUS_LABEL[status] ?? {
    label: status,
    tone: "muted" as StatusTone,
  };

  return (
    <AppPanel tinted className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <StatusPill tone={statusMeta.tone} pulse={status === "ONGOING"}>
              {statusMeta.label}
            </StatusPill>
            {isLocked && (
              <StatusPill tone="danger" icon={Lock}>
                Locked
              </StatusPill>
            )}
            <StatusPill>
              {festival.tierLabel || festival.tier || "Standard"}
            </StatusPill>
          </div>

          <h3 className="truncate text-2xl font-semibold tracking-tight text-heading md:text-3xl">
            {festival.name}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Created {formatDate(createdAt, { tz: displayTz, style: "long" })}
          </p>
        </div>

        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            title="Edit details"
            onClick={() => onEdit(festival)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Lifecycle */}
      {!isExpired && !isPast && (
        <div className="mt-7 border-t border-border pt-5">
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Day {Math.min(daysPassed + 1, totalDays)} of {totalDays}
            </span>
            <span
              className={
                isEndingSoon
                  ? "text-sm font-semibold tabular-nums text-warning"
                  : "text-sm font-semibold tabular-nums text-foreground"
              }
            >
              {daysRemaining} days left
            </span>
          </div>
          <Meter value={progress} tone={isEndingSoon ? "warning" : "primary"} />
        </div>
      )}

      {isPast && (
        <p className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
          <span className="font-medium text-warning">Event is past.</span> The
          festival is read-only and expires in {daysRemaining} day
          {daysRemaining === 1 ? "" : "s"}.
        </p>
      )}

      {isExpired && (
        <p className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
          <span className="font-medium text-destructive">
            This festival has ended.
          </span>{" "}
          You can still view details and download the results.
        </p>
      )}

      {/* Action */}
      <div className="mt-6">
        {isExpired ? (
          <Button
            asChild
            variant="outline"
            className="h-11 w-full justify-center rounded-full text-sm font-medium sm:w-auto sm:px-8"
          >
            <Link href={`/profile/festivals/${festival.slug}/expired`}>
              View details
            </Link>
          </Button>
        ) : isActive || isPast ? (
          <Button
            asChild
            className="h-11 w-full justify-center rounded-full text-sm font-medium shadow-primary-glow sm:w-auto sm:px-8"
          >
            <Link href={`/dashboard/${festival.slug}`}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {isPast ? "Open dashboard (read-only)" : "Open dashboard"}
            </Link>
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            className="h-11 w-full justify-center rounded-full text-sm font-medium sm:w-auto sm:px-8"
          >
            {isLocked ? "Activation required" : "Past (read-only)"}
          </Button>
        )}
      </div>
    </AppPanel>
  );
}
