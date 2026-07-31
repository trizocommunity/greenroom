"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { parseInstant } from "@/core/datetime";

interface ReportingStatsProps {
  stats: {
    total: number;
    reported: number;
    remaining: number;
    percentageComplete: number;
    elapsedMinutes: number;
    estimatedRemainingMinutes: number | null;
    estimatedEnd: Date | null;
  };
}

export function ReportingStats({ stats }: ReportingStatsProps) {
  const displayTz = useDisplayTimezone();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-primary/5 border-primary/10 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Reported
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.reported}</span>
              <span className="text-sm text-muted-foreground">
                / {stats.total}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-500/5 border-green-500/10 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Progress
              </p>
            </div>
            <span className="text-sm font-bold text-green-700">
              {Math.round(stats.percentageComplete)}%
            </span>
          </div>
          <Progress value={stats.percentageComplete} className="h-2" />
        </CardContent>
      </Card>

      <Card className="bg-orange-500/5 border-orange-500/10 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-500/10 text-orange-600">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Est. Completion
            </p>
            <p className="text-lg font-bold truncate">
              {(() => {
                const d = parseInstant(stats.estimatedEnd);
                return d
                  ? formatInTimeZone(d, displayTz, "h:mm a")
                  : "Calculating...";
              })()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
