import { notFound, redirect } from "next/navigation";
import { StagesClient } from "@/components/festival/event-works/stage-management/StagesClient";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { getStages } from "@/features/stages/actions/stage.actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StageManagementPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  // Feature Access Check (respects Super Admin plan-feature overrides)
  const canManageStages = await getEffectiveFeatureEnabled(
    festival.tier,
    "stageManagement",
  );
  if (!canManageStages) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=stageManagement`,
    );
  }

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  const canCreateEditDeleteStages =
    context?.role === "OWNER" ||
    context?.role === "SUPER_ADMIN" ||
    context?.role === "ADMIN";

  const stages = await getStages(festival.id);

  return (
    <div className="container">
      <StagesClient
        festivalId={festival.id}
        stages={stages}
        canManageStages={canCreateEditDeleteStages}
      />
    </div>
  );
}
