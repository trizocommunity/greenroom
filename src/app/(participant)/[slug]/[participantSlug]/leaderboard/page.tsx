import { notFound } from "next/navigation";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import type { Tier } from "@/core/types/app-enums";
import { isProgrammeInEventWorks } from "@/features/programmes/services/programme-status.service";
import { getFestivalLeaderboardDataBySlug } from "@/features/results/services/leaderboard.service";

export default async function ParticipantLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;

  const { festival, participant } = await requireParticipantAuth(
    slug,
    participantSlug,
    true,
  );

  const leaderGroupId = participant.groupId;
  const leaderCategoryId = participant.categoryId;
  if (!leaderGroupId || !leaderCategoryId) notFound();

  const { festival: leaderboardFestival } =
    await getFestivalLeaderboardDataBySlug(slug);
  if (!leaderboardFestival) notFound();

  const tier = (leaderboardFestival.tier ?? "STANDARD") as Tier;
  const resultsInEventWorks = leaderboardFestival.results.filter(
    (r: any) =>
      r.programme && isProgrammeInEventWorks(r.programme.status, tier),
  );

  const groupName = participant.group?.name;
  const publishedStandingsFiltered = groupName
    ? ((leaderboardFestival.teamStandings as any[]) ?? []).filter(
        (t) => t?.name === groupName,
      )
    : ((leaderboardFestival.teamStandings as any[]) ?? []);

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding
      ? (festival.branding as any).colors?.primary || "#000000"
      : "#000000";

  return (
    <div className="pt-4 sm:pt-6 max-w-7xl mx-auto px-4 md:px-6">
      <LeaderboardClient
        festival={{
          id: festival.id,
          name: festival.name,
          slug: festival.slug,
          accentColor,
        }}
        results={resultsInEventWorks}
        publishedStandings={publishedStandingsFiltered}
        categories={[]}
        groups={[
          {
            id: leaderGroupId,
            name: participant.group?.name ?? "Group",
          },
        ]}
        defaultParticipantFilterCategory="all"
        defaultParticipantFilterGroup={leaderGroupId}
        hideParticipantFilters
        readOnly
        hideLiveStandings
      />
    </div>
  );
}
