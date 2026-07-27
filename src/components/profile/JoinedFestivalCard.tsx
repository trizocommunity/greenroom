"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import Link from "next/link";
import type { Festival } from "@/api/contracts/festivals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FESTIVAL_STATUS_LABELS,
  getDerivedFestivalStatus,
} from "@/features/festivals/services/festival-status.service";

interface JoinedFestivalCardProps {
  festival: Festival & { memberRole?: string };
}

export function JoinedFestivalCard({ festival }: JoinedFestivalCardProps) {
  const status = getDerivedFestivalStatus({
    status: festival.status,
    startDate: festival.startDate,
    endDate: festival.endDate,
    expiresAt: festival.expiresAt,
  });
  const isExpired = status === "EXPIRED";
  const isPast = status === "PAST";
  const isActive = !isExpired && (status === "ONGOING" || status === "READY");
  const isLocked = festival.isLocked;

  return (
    <Card className="group relative overflow-hidden border border-border rounded-2xl bg-card shadow-premium transition-shadow duration-300 hover:shadow-premium-lg">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80" />

      <CardContent className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={
                isExpired ? "destructive" : isActive ? "default" : "secondary"
              }
              className={
                isExpired
                  ? "bg-destructive text-white"
                  : isActive
                    ? "bg-success hover:bg-success/90"
                    : ""
              }
            >
              {FESTIVAL_STATUS_LABELS[status] ?? status}
            </Badge>
            {festival.memberRole && (
              <Badge variant="secondary" className="font-medium">
                {festival.memberRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-xl md:text-2xl tracking-tight text-heading group-hover:text-primary transition-colors duration-300 truncate">
            {festival.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {festival.slug}.greenroom.com
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isActive || isPast ? (
            <Button
              asChild
              size="sm"
              className="flex-1 sm:flex-none rounded-full font-medium shadow-primary-glow hover:opacity-90 transition-opacity"
            >
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {isPast ? "Dashboard (read-only)" : "Dashboard"}
              </Link>
            </Button>
          ) : isExpired ? (
            <Button
              disabled
              size="sm"
              variant="secondary"
              className="rounded-full font-medium"
            >
              Festival ended
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="secondary"
              className="rounded-full font-medium"
            >
              {isLocked ? <Lock className="mr-2 w-4 h-4" /> : null}
              {isLocked ? "Locked" : "Past (read-only)"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
