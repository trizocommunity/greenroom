import { notFound } from "next/navigation";
import { GroupStandingsClient } from "@/components/dashboard/announcement/GroupStandingsClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import { getAnnouncerBlockProgress } from "@/features/announcement/services/announcer-result-count.service";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { getFestivalLeaderboardDataBySlug } from "@/features/results/services/leaderboard.service";

export default async function GroupStandingsPage({
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

  if (
    !context ||
    !["ANNOUNCER", "ADMIN", "OWNER", "SUPER_ADMIN"].includes(context.role)
  ) {
    notFound();
  }

  const { festival } = await getFestivalLeaderboardDataBySlug(slug);
  if (!festival) notFound();

  const tier = (festival.tier ?? "STANDARD") as Tier;
  const canUse = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );
  if (!canUse) notFound();

  const publishedStandings = Array.isArray(festival.teamStandings)
    ? (festival.teamStandings as {
        name: string;
        points: number;
        rank?: number;
      }[])
    : [];
  const block = await getAnnouncerBlockProgress(festival.id);

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Group Standings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Publish team standings after the configured number of announced
          results. The public site and leaderboard show standings only until the
          next batch.
        </p>
      </div>
      <GroupStandingsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        groups={festival.groups}
        results={festival.results}
        publishedStandings={publishedStandings}
        publicDisplayMode={
          (festival.publicDisplayMode as
            | "programme_results"
            | "team_standings") ?? "programme_results"
        }
        block={block}
      />
    </div>
  );
}
