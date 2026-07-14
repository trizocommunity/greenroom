import { Calendar, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import { getAnnouncerBlockProgress } from "@/features/announcement/services/announcer-result-count.service";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";
import { filterProgrammesForEventWorks } from "@/features/programmes/services/programme-status.service";
import { getFestivalLeaderboardDataBySlug } from "@/features/results/services/leaderboard.service";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  const { festival, assignmentCount } =
    await getFestivalLeaderboardDataBySlug(slug);

  if (!festival) {
    return notFound();
  }

  const tier = getResolvedTier(festival.tier) as Tier;
  const canViewLeaderboard = await getEffectiveFeatureEnabled(
    tier,
    "liveScoreboard",
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
        description="Leaderboard will be populated once assignments and results are available."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-event-works/assignments`}
        icon={Trophy}
      />
    );
  }

  const block = !isBasicTier(tier)
    ? await getAnnouncerBlockProgress(festival.id)
    : null;

  return (
    <div className="pt-4 sm:pt-6">
      <LeaderboardClient
        festival={festival}
        tier={tier}
        results={resultsInEventWorks}
        publishedStandings={festival.teamStandings as any[]}
        categories={festival.categories}
        groups={festival.groups}
        publicDisplayMode={
          (festival.publicDisplayMode as
            | "programme_results"
            | "team_standings") ?? "programme_results"
        }
        festivalRole={context?.role}
        block={block}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            {isBasicTier(tier)
              ? "Internal team and student standings from published results."
              : "Desk preview (published) and on-air standings (published and announced)."}
          </p>
        </div>
      </LeaderboardClient>
    </div>
  );
}
