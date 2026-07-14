import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          Manage staff roles for this festival (Admin, Stage Manager,
          Announcer).
        </p>
      </div>
      <MembersClient festivalId={festival.id} />
    </div>
  );
}
