import { notFound, redirect } from "next/navigation";
import { StagesClient } from "@/components/festival/event-works/stage-management/StagesClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";
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
  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManageStages = isEnabled(
    festival.tier,
    "stageManagement",
    effectiveFeatures,
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

  if (!canCreateEditDeleteStages) {
    redirect(`/dashboard/${slug}?error=forbidden`);
  }

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
