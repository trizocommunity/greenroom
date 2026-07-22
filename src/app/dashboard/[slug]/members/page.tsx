import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
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
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  const festivalContext = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });

  if (!festivalContext) return notFound();
  const { role: userRole } = festivalContext;

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
    <div className="pt-4 sm:pt-6">
      <MembersClient festivalId={festival.id} userRole={userRole}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Members
          </h1>
        </div>
      </MembersClient>
    </div>
  );
}
