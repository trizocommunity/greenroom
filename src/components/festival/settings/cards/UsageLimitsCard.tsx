"use client";

import { Database, LayoutList, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIER_CONFIG } from "@/config/pricing";
import type { Tier } from "@/core/types/app-enums";

interface UsageLimitsCardProps {
  festival: {
    tier: Tier | null;
    tierLabel?: string | null;
    participantsCount?: number | null;
    programmesCount?: number | null;
    stagesCount?: number | null;
    storageUsedMb?: number | null;
  };
}

export function UsageLimitsCard({ festival }: UsageLimitsCardProps) {
  const tier = festival.tier ?? "BASIC";
  const tierConfig = TIER_CONFIG[tier];
  const tierLabel = festival.tierLabel ?? tierConfig.label;

  const usage = {
    participants: festival.participantsCount ?? 0,
    programmes: festival.programmesCount ?? 0,
    stages: festival.stagesCount ?? 0,
    storage: festival.storageUsedMb ?? 0,
  };

  const limits = {
    participants: tierConfig.limits.participants,
    programmes: tierConfig.limits.programmes,
    stages: tierConfig.limits.stages,
    storageMB: tierConfig.limits.storageMB,
  };

  const items = [
    {
      label: "Participants",
      icon: Users,
      used: usage.participants,
      limit: limits.participants,
      color: "text-blue-500",
    },
    {
      label: "Programmes",
      icon: LayoutList,
      used: usage.programmes,
      limit: limits.programmes,
      color: "text-green-500",
    },
    {
      label: "Stages",
      icon: MapPin,
      used: usage.stages,
      limit: limits.stages,
      color: "text-orange-500",
    },
    {
      label: "Storage",
      icon: Database,
      used: usage.storage,
      limit: limits.storageMB,
      unit: "MB",
      color: "text-yellow-500",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Usage &amp; Limits</CardTitle>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 font-bold">
            {tierLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => {
          const percentage = Math.min(
            100,
            Math.max(0, (item.used / (item.limit || 1)) * 100),
          );

          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                <span className="font-mono text-muted-foreground">
                  {item.unit
                    ? `${item.used} ${item.unit} / ${item.limit} ${item.unit}`
                    : `${item.used} / ${item.limit}`}
                </span>
              </div>
              <Progress
                value={percentage}
                className="h-1.5"
                indicatorClassName={item.color.replace("text-", "bg-")}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
