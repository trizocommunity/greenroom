import type { Tier } from "@prisma/client";
import type { FeaturePath } from "@/lib/features";
import { Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEffectivePlanFeatureMatrix } from "@/server/services/plan-features.service";
import { PlanFeaturesClient } from "./PlanFeaturesClient";

export default async function PlanFeaturesPage() {
  const matrix = await getEffectivePlanFeatureMatrix();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Plan Features</h2>
        <p className="text-muted-foreground">
          Enable or disable features per plan (BASIC, STANDARD, PRO). Changes
          apply to all festivals on that plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Feature matrix</CardTitle>
              <CardDescription>
                Row = feature, column = plan. Toggle to override default from
                config.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlanFeaturesClient matrix={matrix as Record<Tier, Partial<Record<FeaturePath, boolean>>>} />
        </CardContent>
      </Card>
    </div>
  );
}
