"use client";

import type { Tier } from "@/lib/prisma-enums";
import type { FeaturePath } from "@/lib/features";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Square } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  PLAN_FEATURE_LABELS,
  PLAN_FEATURE_TOGGLE_KEYS,
  PLANS,
} from "@/config/plan-features.config";
import { setPlanFeatureOverrideAction } from "@/server/actions/plan-features.actions";

type Matrix = Record<Tier, Partial<Record<FeaturePath, boolean>>>;

function cellKey(tier: Tier, feature: FeaturePath) {
  return `${tier}:${feature}`;
}

export function PlanFeaturesClient({ matrix }: { matrix: Matrix }) {
  const router = useRouter();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const handleToggle = (tier: Tier, feature: FeaturePath, current: boolean) => {
    const key = cellKey(tier, feature);
    setPendingCell(key);
    setPlanFeatureOverrideAction(tier, feature, !current)
      .then((res) => {
        if (res.success) {
          toast.success(
            `${PLAN_FEATURE_LABELS[feature]} for ${tier}: ${!current ? "On" : "Off"}`,
          );
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to update");
        }
      })
      .finally(() => setPendingCell(null));
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[280px] font-semibold">Feature</TableHead>
            {PLANS.map((plan) => (
              <TableHead
                key={plan}
                className="text-center font-semibold min-w-[120px]"
              >
                {plan}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PLAN_FEATURE_TOGGLE_KEYS.map((featureKey) => (
            <TableRow key={featureKey} className="hover:bg-muted/20">
              <TableCell className="font-medium py-3">
                {PLAN_FEATURE_LABELS[featureKey] ?? featureKey}
              </TableCell>
              {PLANS.map((tier) => {
                const enabled = Boolean(matrix[tier]?.[featureKey]);
                const isPending = pendingCell === cellKey(tier, featureKey);
                return (
                  <TableCell key={tier} className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      disabled={!!pendingCell}
                      onClick={() => handleToggle(tier, featureKey, enabled)}
                      title={`${enabled ? "Disable" : "Enable"} for ${tier}`}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : enabled ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
