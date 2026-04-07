import { Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEffectiveFeatureTagMatrix } from "@/server/services/plan-features-tags.service";
import { PlanFeaturesClient } from "./PlanFeaturesClient";

export default async function PlanFeaturesPage() {
  const tagMatrix = await getEffectiveFeatureTagMatrix();

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
              <CardTitle className="text-lg">Feature Tags</CardTitle>
              <CardDescription>
                Toggle business-intent feature tags per plan. Alias tags map 1:1
                to underlying feature flags.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlanFeaturesClient tagMatrix={tagMatrix} />
        </CardContent>
      </Card>
    </div>
  );
}
