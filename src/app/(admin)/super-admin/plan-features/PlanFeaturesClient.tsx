"use client";

import { Check, Loader2, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLANS } from "@/config/plan-features.config";
import type { Tier } from "@/core/types/app-enums";
import { setPlanFeatureTagOverrideAction } from "@/features/plan-features/actions/plan-features.actions";
import type { FeatureTag } from "@/features/plan-features/services/features-tags";
import {
  FEATURE_TAGS,
  getFeatureTagLabel,
  getFeatureTagRequirements,
} from "@/features/plan-features/services/features-tags";

type TagMatrix = Record<Tier, Partial<Record<FeatureTag, boolean>>>;

function cellKey(tier: Tier, key: string) {
  return `${tier}:${key}`;
}

export function PlanFeaturesClient({ tagMatrix }: { tagMatrix: TagMatrix }) {
  const router = useRouter();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const handleToggleTag = (tier: Tier, tag: FeatureTag, current: boolean) => {
    const key = cellKey(tier, tag);
    setPendingCell(key);
    setPlanFeatureTagOverrideAction(tier, tag, !current)
      .then((res) => {
        if (res.success) {
          toast.success(
            `${getFeatureTagLabel(tag)} for ${tier}: ${!current ? "On" : "Off"}`,
          );
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to update");
        }
      })
      .finally(() => setPendingCell(null));
  };

  const isTagToggleDisabled = (tier: Tier, tag: FeatureTag): boolean => {
    const req = getFeatureTagRequirements(tag);
    if (req.allowedTiers && !req.allowedTiers.includes(tier)) return true;
    if (req.hardBlockBasics && tier === "BASIC") return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[280px] font-semibold">
                Feature Tags
              </TableHead>
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
            {FEATURE_TAGS.map((tag) => (
              <TableRow key={tag} className="hover:bg-muted/20">
                <TableCell className="font-medium py-3">
                  {getFeatureTagLabel(tag)}
                </TableCell>
                {PLANS.map((tier) => {
                  const enabled = Boolean(tagMatrix[tier]?.[tag]);
                  const isPending = pendingCell === cellKey(tier, tag);
                  const disabled = isTagToggleDisabled(tier, tag);

                  return (
                    <TableCell key={tier} className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={!!pendingCell || disabled}
                        onClick={() => handleToggleTag(tier, tag, enabled)}
                        title={
                          disabled
                            ? "Not applicable for this tier"
                            : `${enabled ? "Disable" : "Enable"} for ${tier}`
                        }
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
    </div>
  );
}
