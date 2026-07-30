"use client";

import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIER_CONFIG } from "@/config/pricing";
import type { Tier } from "@/core/types/app-enums";

interface PlanPaymentCardProps {
  festival: {
    tier: Tier | null;
    tierLabel?: string | null;
  };
}

export function PlanPaymentCard({ festival }: PlanPaymentCardProps) {
  const tier = festival.tier ?? "BASIC";
  const tierConfig = TIER_CONFIG[tier];
  const tierLabel = festival.tierLabel ?? tierConfig.label;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Plan &amp; Payment</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
            {tierLabel}
          </div>
          <p className="text-sm text-muted-foreground">
            Current plan active on this festival
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
