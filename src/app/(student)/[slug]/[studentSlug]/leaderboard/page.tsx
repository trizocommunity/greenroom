import { notFound } from "next/navigation";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { getFestivalLeaderboardDataBySlug } from "@/server/services/leaderboard.service";
import {
  isProgrammeInEventWorks,
} from "@/server/services/programme-status.service";
import type { Tier } from "@prisma/client";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function StudentLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();
  await assertFestivalAccess(session, festival.id);

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

  if (!student.isTeamLeader) notFound();

  const leaderGroupId = student.groupId;
  const leaderCategoryId = student.categoryId;
  if (!leaderGroupId || !leaderCategoryId) notFound();

  const { festival: leaderboardFestival } = await getFestivalLeaderboardDataBySlug(slug);
  if (!leaderboardFestival) notFound();

  const tier = (leaderboardFestival.tier ?? "STANDARD") as Tier;
  const resultsInEventWorks = leaderboardFestival.results.filter(
    (r: any) =>
      r.programme &&
      isProgrammeInEventWorks(r.programme.status, tier),
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

