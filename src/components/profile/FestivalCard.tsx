"use client";

import { addDays, differenceInDays } from "date-fns";
import { Clock, LayoutDashboard, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import type { Festival } from "@/api/contracts/festivals";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, parseInstant } from "@/core/datetime";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
}

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

  const totalDays = 30;
  const displayTz = useDisplayTimezone();
  const createdAt = parseInstant(festival.createdAt) ?? new Date(NaN);
  const expiresAt = festival.expiresAt
    ? (parseInstant(festival.expiresAt) ?? addDays(createdAt, totalDays))
    : addDays(createdAt, totalDays);

  const daysPassed = Math.max(0, differenceInDays(new Date(), createdAt));
  const daysRemaining = Math.max(0, differenceInDays(expiresAt, new Date()));
  const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-premium transition-shadow duration-500 hover:shadow-premium-lg">
      {/* Subtle backdrop gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5 opacity-70 group-hover:opacity-90" />

      <CardContent className="relative p-5 sm:p-6 space-y-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge
                variant={
                  isExpired ? "destructive" : isActive ? "default" : "secondary"
                }
                className={
                  isActive
                    ? "bg-success text-white hover:bg-success/90"
                    : undefined
                }
              >
                {status === "EXPIRED"
                  ? "Expired"
                  : status === "ONGOING"
                    ? "Ongoing"
                    : status === "PAST"
                      ? "Past"
                      : "Ready"}
              </Badge>
              {isLocked && (
                <Badge
                  variant="outline"
                  className="border-destructive/40 text-destructive bg-destructive/10 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Locked
                </Badge>
              )}
              <Badge className="bg-muted text-muted-foreground text-xs font-medium border-border">
                Plan: {festival.tierLabel || festival.tier || "Standard"}
              </Badge>
            </div>
            <h3 className="font-semibold text-2xl md:text-3xl tracking-tight text-heading truncate">
              {festival.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Created{" "}
              {formatDate(createdAt, { tz: displayTz, style: "long" })}
            </p>
          </div>

          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors duration-300 shrink-0"
              title="Edit Details"
              onClick={() => onEdit(festival)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Lifecycle Progress Section */}
        {!isExpired && !isPast && (
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">Lifecycle progress</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Day {Math.min(daysPassed + 1, totalDays)} of {totalDays}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold tabular-nums ${
                  daysRemaining <= 5
                    ? "text-warning animate-pulse"
                    : "text-primary"
                }`}
              >
                {daysRemaining} days left
              </span>
            </div>

            <div className="relative mt-1.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span>Day 1</span>
              <span>Day {totalDays}</span>
            </div>
          </div>
        )}

        {isPast && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3.5">
            <p className="text-sm font-semibold text-warning">
              Event is past. Festival is in read-only mode.
            </p>
            <p className="text-xs text-warning/80 mt-1">
              Expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}.
            </p>
          </div>
        )}

        {isExpired && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/40 text-center">
            <p className="text-sm font-semibold text-destructive">
              This festival has ended. View details or download results.
            </p>
          </div>
        )}

        {/* Actions Section */}
        <div className="pt-2">
          {isExpired ? (
            <Button
              asChild
              variant="outline"
              className="w-full justify-center rounded-full h-11 text-sm font-medium border-border hover:bg-muted"
            >
              <Link href={`/profile/festivals/${festival.slug}/expired`}>
                View details
              </Link>
            </Button>
          ) : isActive || isPast ? (
            <Button
              asChild
              className="w-full justify-center rounded-full h-11 text-sm font-medium bg-linear-to-r from-primary to-secondary text-white shadow-primary-glow hover:opacity-90 transition-opacity"
            >
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {isPast ? "Open dashboard (read-only)" : "Open dashboard"}
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="w-full rounded-full h-11 text-sm opacity-70 bg-muted text-muted-foreground border border-border"
            >
              {isLocked ? "Activation required" : "Past (read-only)"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
