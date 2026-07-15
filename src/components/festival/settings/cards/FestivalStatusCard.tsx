"use client";

import { Calendar } from "lucide-react";
import { FestivalStatusBadge } from "@/components/festival/FestivalStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFestivalDateDDMMYY,
  getDerivedFestivalStatus,
} from "@/features/festivals/services/festival-status.service";

interface FestivalStatusCardProps {
  festival: {
    status: string;
    createdAt?: Date | string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    expiresAt?: Date | string | null;
  };
}

export function FestivalStatusCard({ festival }: FestivalStatusCardProps) {
  const derivedStatus = getDerivedFestivalStatus(festival);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Festival Status</CardTitle>
          </div>
          <FestivalStatusBadge
            status={derivedStatus}
            startDate={festival.startDate}
            endDate={festival.endDate}
            expiresAt={festival.expiresAt}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Start Date</p>
            <p className="font-medium">
              {formatFestivalDateDDMMYY(festival.startDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">End Date</p>
            <p className="font-medium">
              {formatFestivalDateDDMMYY(festival.endDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
