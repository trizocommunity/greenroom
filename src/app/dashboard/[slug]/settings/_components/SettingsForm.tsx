"use client";

import { format } from "date-fns";
import { Globe, Palette, Settings2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FestivalStatusCard } from "@/components/festival/settings/cards/FestivalStatusCard";
import { PlanPaymentCard } from "@/components/festival/settings/cards/PlanPaymentCard";
import { UsageLimitsCard } from "@/components/festival/settings/cards/UsageLimitsCard";
import { AdvancedSettingsDialog } from "@/components/festival/settings/dialogs/AdvancedSettingsDialog";
import { DeadlinesDialog } from "@/components/festival/settings/dialogs/DeadlinesDialog";
import { FestivalDetailsDialog } from "@/components/festival/settings/dialogs/FestivalDetailsDialog";
import { TeamResultsDialog } from "@/components/festival/settings/dialogs/TeamResultsDialog";
import { VisualIdentityDialog } from "@/components/festival/settings/dialogs/VisualIdentityDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureService } from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";

interface SettingsFormProps {
  festival: any;
}

export function SettingsForm({ festival }: SettingsFormProps) {
  const router = useRouter();
  const resolvedTier = getResolvedTier(festival.tier);
  const isBasic = resolvedTier === "BASIC";

  const isProgrammeDeadlineEnabled = FeatureService.isFeatureEnabled(
    resolvedTier,
    "programmeAssignmentDeadline",
  );
  const isAdvancedSettingsEnabled = FeatureService.isFeatureEnabled(
    resolvedTier,
    "advancedSettings",
  );

  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    router.refresh();
    setRefreshKey((k) => k + 1);
  };

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="general" className="gap-2">
          <Globe className="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="configuration" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configuration
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Visual Identity</CardTitle>
                </div>
                <VisualIdentityDialog
                  festival={festival}
                  onSuccess={handleSuccess}
                />
              </div>
              <CardDescription>
                Customise how your festival appears online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {festival.branding?.logo ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <Image
                      src={festival.branding.logo}
                      alt="Festival Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Logo uploaded</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No logo uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          <FestivalStatusCard
            key={`status-${refreshKey}`}
            festival={festival}
          />

          <UsageLimitsCard key={`usage-${refreshKey}`} festival={festival} />

          <PlanPaymentCard key={`plan-${refreshKey}`} festival={festival} />
        </div>
      </TabsContent>

      <TabsContent value="configuration" className="space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Festival Details</CardTitle>
                  <CardDescription>
                    Core identity and timing of your festival.
                  </CardDescription>
                </div>
                <FestivalDetailsDialog
                  festival={festival}
                  onSuccess={handleSuccess}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">{festival.name}</p>
                {festival.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {festival.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Start Date
                  </p>
                  <p className="font-medium">
                    {festival.startDate
                      ? format(new Date(festival.startDate), "dd/MM/yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">End Date</p>
                  <p className="font-medium">
                    {festival.endDate
                      ? format(new Date(festival.endDate), "dd/MM/yyyy")
                      : "—"}
                  </p>
                </div>
              </div>
              {festival.location && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Venue / City
                  </p>
                  <p className="font-medium">{festival.location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Deadlines</CardTitle>
                  <CardDescription>
                    Set deadlines for programme assignments.
                  </CardDescription>
                </div>
                <DeadlinesDialog
                  festival={festival}
                  onSuccess={handleSuccess}
                  isFeatureEnabled={isProgrammeDeadlineEnabled}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Programme Assignment
                  </p>
                  <p className="font-medium">
                    {festival.programmeAssignmentDeadline
                      ? format(
                          new Date(festival.programmeAssignmentDeadline),
                          "dd/MM/yyyy HH:mm",
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Team &amp; Results</CardTitle>
                  <CardDescription>
                    Configure team limits and result display settings.
                  </CardDescription>
                </div>
                <TeamResultsDialog
                  festival={festival}
                  onSuccess={handleSuccess}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Team Leader Limit
                  </p>
                  <p className="font-medium">
                    {festival.teamLeaderLimit ?? 2} per group
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Results per Standings
                  </p>
                  <p className="font-medium">
                    {festival.announcerResultsPerStandings ?? 10}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Advanced</CardTitle>
                  <CardDescription>
                    Configure scoring system and result display preferences.
                  </CardDescription>
                </div>
                <AdvancedSettingsDialog
                  festival={festival}
                  onSuccess={handleSuccess}
                  isFeatureEnabled={isAdvancedSettingsEnabled}
                />
              </div>
            </CardHeader>
            {isAdvancedSettingsEnabled ? (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Scoring System
                    </p>
                    <p className="font-medium">
                      {festival.scoringSystem === "POSITION_BASED"
                        ? "Position Based"
                        : "Score Based"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Public Display
                    </p>
                    <p className="font-medium">
                      {festival.publicDisplayMode === "team_standings"
                        ? "Team Standings"
                        : "Programme Results"}
                    </p>
                  </div>
                </div>
                {festival.chestNumberSettings?.prefix && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Chest Number Prefix
                    </p>
                    <p className="font-medium">
                      {festival.chestNumberSettings.prefix}
                    </p>
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional options for your plan.
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
