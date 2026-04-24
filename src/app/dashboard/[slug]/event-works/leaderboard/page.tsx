import type { Tier } from "@/lib/app-enums";
import { Calendar, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { getFestivalLeaderboardDataBySlug } from "@/server/services/leaderboard.service";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import {
  filterProgrammesForEventWorks,
  isProgrammeInEventWorks,
} from "@/server/services/programme-status.service";

export default async function TeamStatusPage({
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

  const tier = (festival.tier ?? "STANDARD") as Tier;
  const canViewLeaderboard =
    tier === "BASIC"
      ? true
      : await getEffectiveFeatureEnabled(festival.tier, "liveScoreboard");
  if (!canViewLeaderboard) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=liveScoreboard`,
    );
  }
  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes,
    tier,
  );
  const resultsInEventWorks = festival.results.filter((r) => {
    if (!r.programme) return false;
    // BASIC can have valid judged/published marks before programme status
    // transitions are fully aligned with Event Works gating.
    if (tier === "BASIC") return true;
    return isProgrammeInEventWorks(r.programme.status, tier);
  });

  if (tier !== "BASIC" && eventWorksProgrammes.length === 0) {
    return (
      <EmptyState
        title="No programmes in Event Works yet"
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre-Works to see them in Marks, Results, and Leaderboard."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-works/schedule`}
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
        actionLink={`/dashboard/${slug}/pre-works/assignments`}
        icon={Trophy}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <LeaderboardClient
        festival={festival}
        results={resultsInEventWorks}
        publishedStandings={festival.teamStandings as any[]}
        categories={festival.categories}
        groups={festival.groups}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Leaderboard
        </h1>
      </LeaderboardClient>
    </div>
  );
}
