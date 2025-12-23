"use client";

import { Separator } from "@/components/ui/separator";
import {
  FestivalRoleBadge,
  type FestivalRole,
} from "@/components/festival/FestivalRoleBadge";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";
import { Clock } from "lucide-react";
import type { EditionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StatusStripProps {
  festivalName: string;
  editionName: string | null;
  editionStatus: EditionStatus | null;
  daysRemaining?: number | null;
  userRole: FestivalRole | string;
}

export function StatusStrip({
  festivalName,
  editionName,
  editionStatus,
  daysRemaining,
  userRole,
  orientation = "horizontal",
}: StatusStripProps & { orientation?: "horizontal" | "vertical" }) {
  if (orientation === "vertical") {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
        {/* Header Section */}
        <div className="space-y-1">
          <h2
            className="font-bold text-base text-foreground tracking-tight leading-tight truncate"
            title={festivalName}
          >
            {festivalName}
          </h2>
          {editionName && (
            <div className="text-muted-foreground text-xs font-medium flex items-center gap-1.5 truncate">
              <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
              {editionName}
            </div>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Status
            </span>
            <div>
              {editionStatus ? (
                <EditionStatusBadge
                  status={editionStatus}
                  size="sm"
                  className="w-full justify-center shadow-none text-[10px] h-6 px-1"
                />
              ) : (
                <span className="text-muted-foreground text-xs italic">
                  N/A
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Clock className="w-3 h-3 inline mr-1" />
              Time Left
            </span>
            {daysRemaining !== undefined &&
            daysRemaining !== null &&
            editionStatus === "ACTIVE" ? (
              <div
                className={cn(
                  "flex items-center justify-center px-1 h-6 rounded-md text-[10px] font-bold border",
                  daysRemaining <= 3
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-background text-foreground border-border",
                )}
              >
                <span>
                  {daysRemaining <= 0 ? "Ended" : `${daysRemaining} Days`}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">-</div>
            )}
          </div>
        </div>

        {/* Role Badge - Compact */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground">Role</span>
          <FestivalRoleBadge
            festivalRole={userRole}
            variant="outline"
            className="text-[10px] py-0 h-5 border-border/40 bg-background/50"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-medium text-foreground hidden md:inline-block">
        {festivalName}
      </span>

      {editionName && (
        <>
          <Separator orientation="vertical" className="h-4 hidden md:block" />
          <span className="text-muted-foreground">{editionName}</span>
        </>
      )}

      {editionStatus && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <EditionStatusBadge status={editionStatus} size="sm" />
        </>
      )}

      {daysRemaining !== undefined &&
        daysRemaining !== null &&
        editionStatus === "ACTIVE" && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {daysRemaining <= 0 ? "Expired" : `${daysRemaining} days left`}
              </span>
            </div>
          </>
        )}

      <Separator orientation="vertical" className="h-4" />
      <FestivalRoleBadge festivalRole={userRole} variant="secondary" />
    </div>
  );
}
