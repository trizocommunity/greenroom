"use client";

import { Separator } from "@/components/ui/separator";
import {
  FestivalRoleBadge,
  type FestivalRole,
} from "@/components/festival/FestivalRoleBadge";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";
import { Clock } from "lucide-react";
import type { EditionStatus } from "@prisma/client";

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
}: StatusStripProps) {
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
