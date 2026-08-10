import { Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEffectiveFeatureTagMatrix } from "@/features/plan-features/services/plan-features-tags.service";
import { PlanFeaturesClient } from "./PlanFeaturesClient";

export default async function PlanFeaturesPage() {
  const tagMatrix = await getEffectiveFeatureTagMatrix();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Plan features
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Enable or disable features per plan (BASIC, STANDARD, PRO). Changes
          apply to all festivals on that plan.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Feature tags</CardTitle>
              <CardDescription>
                Toggle business-intent feature tags per plan. Alias tags map 1:1
                to underlying feature flags.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <PlanFeaturesClient tagMatrix={tagMatrix} />
        </CardContent>
      </Card>
    </div>
  );
}
