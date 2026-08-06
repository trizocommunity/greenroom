import { Calendar, Trophy, Star, Award } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import type { Tier } from "@/core/types/app-enums";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import {
  loadFeatureOverrides,
} from "@/features/plan-features/services/plan-features.service";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";
import { filterProgrammesForEventWorks } from "@/features/programmes/services/programme-status.service";
import { getFestivalLeaderboardDataBySlug } from "@/features/results/services/leaderboard.service";
import { getVocalOfTheFest, getPenOfTheFest } from "@/features/announcement/services/announcer.service";

export default async function TopScorersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { festival, assignmentCount } =
    await getFestivalLeaderboardDataBySlug(slug);

  if (!festival) {
    return notFound();
  }

  const tier = getResolvedTier(festival.tier) as Tier;
  const effectiveFeatures = await loadFeatureOverrides(tier);
  const canViewLeaderboard = isEnabled(
    tier,
    "liveScoreboard",
    effectiveFeatures,
  );
  if (!canViewLeaderboard) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=liveScoreboard`,
    );
  }
  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes,
    tier,
  );
  const eventWorksProgrammeIds = new Set(eventWorksProgrammes.map((p) => p.id));
  const resultsInEventWorks = festival.results.filter(
    (r) => r.programme && eventWorksProgrammeIds.has(r.programme.id),
  );

  const [vocalOfTheFest, penOfTheFest] = await Promise.all([
    getVocalOfTheFest(festival.id),
    getPenOfTheFest(festival.id),
  ]);

  if (!isBasicTier(tier) && eventWorksProgrammes.length === 0) {
    return (
      <EmptyState
        title="No programmes in Event Works yet"
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre Event Works to see them in Marks, Results, and Leaderboard."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-event-works/schedule`}
        icon={Calendar}
      />
    );
  }

  if (assignmentCount === 0) {
    return (
      <EmptyState
        title="No Data Available"
        description="Top Scorers will be populated once assignments and results are available."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-event-works/assignments`}
        icon={Trophy}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      {(vocalOfTheFest || penOfTheFest) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vocalOfTheFest && (
            <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border-violet-500/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-violet-700 dark:text-violet-400">
                  <Star className="h-4 w-4" />
                  Vocal of the Fest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{vocalOfTheFest.name}</p>
                    <p className="text-sm text-muted-foreground">{vocalOfTheFest.groupName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg text-violet-600 dark:text-violet-400">
                      {vocalOfTheFest.stagePoints}
                    </p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {penOfTheFest && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Award className="h-4 w-4" />
                  Pen of the Fest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{penOfTheFest.name}</p>
                    <p className="text-sm text-muted-foreground">{penOfTheFest.groupName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                      {penOfTheFest.offstagePoints}
                    </p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <LeaderboardClient
        festival={festival}
        tier={tier}
        results={resultsInEventWorks}
        publishedStandings={festival.teamStandings as any[]}
        categories={festival.categories}
        groups={festival.groups}
      />
    </div>
  );
}
