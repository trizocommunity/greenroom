"use client";

import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { JoinedFestival } from "@/types/festival";

interface JoinedFestivalCardProps {
  festival: JoinedFestival;
}

export function JoinedFestivalCard({ festival }: JoinedFestivalCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow duration-200 border-dashed bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-md truncate">{festival.name}</h3>
            <div className="mt-2">
              <FestivalRoleBadge role={festival.role} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{format(festival.startDate, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{festival.location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
