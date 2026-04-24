import { notFound } from "next/navigation";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { requireTeamLeaderSession } from "@/core/auth/team-leader-guard";
import type { Tier } from "@/core/types/app-enums";
import { isProgrammeInEventWorks } from "@/features/programmes/services/programme-status.service";
import { getFestivalLeaderboardDataBySlug } from "@/features/results/services/leaderboard.service";

export default async function StudentLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const { festival, student } = await requireTeamLeaderSession({
    slug,
    studentSlug,
  });

  const leaderGroupId = student.groupId;
  const leaderCategoryId = student.categoryId;
  if (!leaderGroupId || !leaderCategoryId) notFound();

  const { festival: leaderboardFestival } =
    await getFestivalLeaderboardDataBySlug(slug);
  if (!leaderboardFestival) notFound();

  const tier = (leaderboardFestival.tier ?? "STANDARD") as Tier;
  const resultsInEventWorks = leaderboardFestival.results.filter(
    (r: any) =>
      r.programme && isProgrammeInEventWorks(r.programme.status, tier),
  );

  const groupName = student.group?.name;
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
            name: student.group?.name ?? "Group",
          },
        ]}
        defaultStudentFilterCategory="all"
        defaultStudentFilterGroup={leaderGroupId}
        hideStudentFilters
        readOnly
        hideLiveStandings
      />
    </div>
  );
}
