import { Calendar, Database, Gavel, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LimitationCardProps {
  tierLabel: string;
  limits: {
    maxParticipants: number;
    maxEvents: number;
    maxJudges: number;
    maxStorageMB: number;
  };
  usage?: {
    participantsCount: number;
    eventsCount: number;
    judgesCount: number;
    storageUsedMB: number;
  };
  className?: string;
}

export function LimitationCard({
  tierLabel,
  limits,
  usage = {
    participantsCount: 0,
    eventsCount: 0,
    judgesCount: 0,
    storageUsedMB: 0,
  },
  className,
}: LimitationCardProps) {
  const items = [
    {
      label: "Participants",
      icon: Users,
      limit: limits.maxParticipants,
      used: usage.participantsCount,
      color: "text-blue-500",
    },
    {
      label: "Events",
      icon: Calendar,
      limit: limits.maxEvents,
      used: usage.eventsCount,
      color: "text-green-500",
    },
    {
      label: "Judges",
      icon: Gavel,
      limit: limits.maxJudges,
      used: usage.judgesCount,
      color: "text-purple-500",
    },
    {
      label: "Storage",
      icon: Database,
      limit: limits.maxStorageMB,
      used: usage.storageUsedMB,
      unit: "MB",
      displayLimit:
        limits.maxStorageMB >= 1024
          ? `${limits.maxStorageMB / 1024} GB`
          : `${limits.maxStorageMB} MB`,
      displayUsed:
        usage.storageUsedMB >= 1024
          ? `${(usage.storageUsedMB / 1024).toFixed(1)} GB`
          : `${usage.storageUsedMB} MB`,
      color: "text-yellow-500",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase flex items-center justify-between">
          <span>Festival Limits</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 font-bold">
            {tierLabel || "Tier"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {items.map((item, index) => {
          const percentage = Math.min(
            100,
            Math.max(0, (item.used / item.limit) * 100),
          );

          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                <div className="text-zinc-500 font-mono">
                  {item.unit
                    ? `${item.displayUsed || item.used} / ${item.displayLimit || item.limit}`
                    : `${item.used} / ${item.limit}`}
                </div>
              </div>
              <Progress
                value={percentage}
                className="h-1 bg-zinc-800"
                indicatorClassName={item.color?.replace("text-", "bg-")}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
