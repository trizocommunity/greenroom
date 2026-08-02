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
  activeTab: "general" | "configuration";
}

/** "5/8/2026 09:00 → 20/8/2026 17:00", or just the close time when no start. */
function formatWindow(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
) {
  const stamp = (value: string | Date) =>
    format(new Date(value), "dd/MM/yyyy HH:mm");
  if (!end && !start) return "—";
  if (!start) return `Until ${stamp(end as string | Date)}`;
  if (!end) return `From ${stamp(start)}`;
  return `${stamp(start)} → ${stamp(end)}`;
}

export function SettingsForm({ festival, activeTab }: SettingsFormProps) {
  const router = useRouter();
  const resolvedTier = getResolvedTier(festival.tier);
  const isBasic = resolvedTier === "BASIC";

  const isProgrammeDeadlineEnabled = FeatureService.isFeatureEnabled(
    resolvedTier,
    "programmeAssignmentDeadline",
  );
  const isParticipantDeadlineEnabled = FeatureService.isFeatureEnabled(
    resolvedTier,
    "participantCreationDeadline",
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

  if (activeTab === "general") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">General</h2>
          <p className="text-sm text-muted-foreground">
            Manage your festival's status, visual identity, and plan details.
          </p>
        </div>

        <div className="divide-y border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
          {/* Visual Identity Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="text-base font-medium">Visual Identity</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Customise how your festival appears online.
              </p>
              {festival.branding?.logo ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                    <Image
                      src={festival.branding.logo}
                      alt="Festival Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium">Logo uploaded</p>
                </div>
              ) : (
                <p className="text-sm font-medium">No logo uploaded yet</p>
              )}
            </div>
            <div>
              <VisualIdentityDialog
                festival={festival}
                onSuccess={handleSuccess}
              />
            </div>
          </div>

          {/* Re-use cards for Status, Usage, Plan - but we can tweak them if we want.
              For now, we render them as is but maybe without Card wrapping if they are internal,
              but since they are external components we might just leave them in a grid below. */}
        </div>

        <div className="grid gap-4">
          <FestivalStatusCard
            key={`status-${refreshKey}`}
            festival={festival}
          />
          <UsageLimitsCard key={`usage-${refreshKey}`} festival={festival} />
          <PlanPaymentCard key={`plan-${refreshKey}`} festival={festival} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Manage event timing, deadlines, and advanced rules.
        </p>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
        {/* Festival Details */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-4">
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">Festival Details</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Core identity and timing of your festival.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{festival.name}</p>
                {festival.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {festival.description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
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
                {festival.location && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Venue / City
                    </p>
                    <p className="font-medium">{festival.location}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <FestivalDetailsDialog
              festival={festival}
              onSuccess={handleSuccess}
            />
          </div>
        </div>

        {/* Deadlines */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-4">
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">Deadlines</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set deadlines for programme assignments and participant
              registration.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Programme Assignment
                </p>
                <p className="font-medium">
                  {formatWindow(
                    festival.programmeAssignmentStartDate,
                    festival.programmeAssignmentDeadline,
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Participant Registration
                </p>
                <p className="font-medium">
                  {formatWindow(
                    festival.participantCreationStartDate,
                    festival.participantCreationDeadline,
                  )}
                </p>
              </div>
            </div>
          </div>
          <div>
            <DeadlinesDialog
              festival={festival}
              onSuccess={handleSuccess}
              isFeatureEnabled={isProgrammeDeadlineEnabled}
              isParticipantDeadlineFeatureEnabled={isParticipantDeadlineEnabled}
            />
          </div>
        </div>

        {/* Team & Results */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-4">
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">Team &amp; Results</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure team limits and result display settings.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Team Leader Limit
                </p>
                <p className="font-medium">
                  {festival.teamLeaderLimit ?? 2} per group
                </p>
              </div>
            </div>
          </div>
          <div>
            <TeamResultsDialog festival={festival} onSuccess={handleSuccess} />
          </div>
        </div>

        {/* Advanced */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-4">
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">Advanced</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure scoring system and result display preferences.
            </p>
            {isAdvancedSettingsEnabled ? (
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Additional options for your plan.
              </p>
            )}
          </div>
          <div>
            <AdvancedSettingsDialog
              festival={festival}
              onSuccess={handleSuccess}
              isFeatureEnabled={isAdvancedSettingsEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
