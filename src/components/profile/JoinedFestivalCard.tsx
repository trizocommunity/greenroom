"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDerivedFestivalStatus,
  FESTIVAL_STATUS_LABELS,
} from "@/lib/festival-status";
import type { Festival } from "@/hooks/useFestivals";

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
  const isActive = !isExpired && (status === "ONGOING" || status === "READY");
  const isLocked = festival.isLocked;

  return (
    <Card className="group relative overflow-hidden border-none shadow-md bg-background/50 backdrop-blur-sm ring-1 ring-border/50 transition-all duration-300 hover:shadow-lg hover:ring-primary/20">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80" />

      <CardContent className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isExpired ? "destructive" : isActive ? "default" : "secondary"}
              className={
                isExpired
                  ? "bg-red-500/90 text-white"
                  : isActive
                    ? "bg-green-500 hover:bg-green-600"
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
          <h3 className="font-bold text-xl md:text-2xl tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 truncate">
            {festival.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {festival.slug}.greenroom.com
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isActive ? (
            <Button asChild size="sm" className="flex-1 sm:flex-none shadow-sm">
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : isExpired ? (
            <Button disabled size="sm" variant="secondary">
              Festival ended
            </Button>
          ) : (
            <Button disabled size="sm" variant="secondary">
              {isLocked ? <Lock className="mr-2 w-4 h-4" /> : null}
              {isLocked ? "Locked" : "Inactive"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
