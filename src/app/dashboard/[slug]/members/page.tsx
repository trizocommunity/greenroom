import { notFound, redirect } from "next/navigation";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findMembersByFestival } from "@/server/models/member.model";
import { MembersClient } from "./_components/MembersClient";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // Feature Access Check
  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier),
      "members",
    )
  ) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=members`);
  }

  const maxTeamMembers =
    FeatureService.getFeatureValue<number>(
      getTierForFeatureCheck(festival.tier),
      "maxTeamMembers",
    ) ?? 1;
  const members = await findMembersByFestival(festival.id);
  const totalMemberCount = 1 + members.length; // owner + FestivalMembers
  const atMemberCap = totalMemberCount >= maxTeamMembers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          View all Admins and Team Leaders associated with this festival.
        </p>
      </div>
      <MembersClient
        festivalId={festival.id}
        maxTeamMembers={maxTeamMembers}
        totalMemberCount={totalMemberCount}
        atMemberCap={atMemberCap}
      />
    </div>
  );
}
