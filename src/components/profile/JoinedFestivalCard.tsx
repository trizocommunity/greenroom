"use client";

import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Card, CardContent } from "@/components/ui/card";
import { generateJoinedPattern } from "@/lib/svg-patterns";

import type { JoinedFestival } from "@/types/festival";

interface JoinedFestivalCardProps {
  festival: JoinedFestival;
}

export function JoinedFestivalCard({ festival }: JoinedFestivalCardProps) {
  const bgPattern = generateJoinedPattern(festival.name);

  return (
    <Card className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300">
      <div
        className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: `url('${bgPattern}')`,
          backgroundSize: "100px 100px",
        }}
      />
      <div className="absolute inset-0 bg-background/95 backdrop-blur-[1px]" />

      <CardContent className="relative p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <span className="text-lg font-bold text-primary">
            {festival.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">
              {festival.name}
            </h3>
            <FestivalRoleBadge festivalRole={festival.role} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>{format(festival.startDate, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[100px]">
                {festival.location}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
