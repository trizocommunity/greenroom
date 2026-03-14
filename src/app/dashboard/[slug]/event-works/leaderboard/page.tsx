import { notFound, redirect } from "next/navigation";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { EmptyState } from "@/components/common/EmptyState";
import { Trophy } from "lucide-react";
import { getFestivalLeaderboardDataBySlug } from "@/server/services/leaderboard.service";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";

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

  const canViewLeaderboard = await getEffectiveFeatureEnabled(
    festival.tier,
    "liveScoreboard",
  );
  if (!canViewLeaderboard) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=liveScoreboard`,
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
        results={festival.results}
        publishedStandings={festival.teamStandings as any[]}
        categories={festival.categories}
        groups={festival.groups}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leaderboard</h1>
      </LeaderboardClient>
    </div>
  );
}
