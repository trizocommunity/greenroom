import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JudgementWizardClient } from "@/components/dashboard/judgement/JudgementWizardClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getJudgementDashboardDataAction } from "@/features/judgement/actions/judgement.actions";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { getStages } from "@/features/stages/actions/stage.actions";
import { getStageFilterCookie } from "@/features/stages/stage-filter-cookie.server";

export const metadata: Metadata = {
  title: "Judgement",
};

export default async function JudgementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, name: true, slug: true, tier: true },
  });

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as any;

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.judgementUI",
  );
  if (!canUseJudging) {
    return notFound();
  }

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) return notFound();
  if (
    !["OWNER", "ADMIN", "STAGE_MANAGER", "SUPER_ADMIN"].includes(context.role)
  )
    return notFound();

  const isStageManager = context.role === "STAGE_MANAGER";
  const [initialDashboardData, stages] = await Promise.all([
    getJudgementDashboardDataAction(festival.id),
    getStages(festival.id),
  ]);

  let initialStageId: string | null = null;
  if (isStageManager) {
    initialStageId = await getStageFilterCookie(
      festival.id,
      stages.map((s) => s.id),
    );
  }

  if (isStageManager && stages.length === 0) {
    return (
      <JudgementWizardClient
        festivalId={festival.id}
        initialDashboardData={initialDashboardData as any}
        stages={[]}
        initialStageId={null}
        hideStageFilter
      />
    );
  }

  return (
    <JudgementWizardClient
      festivalId={festival.id}
      initialDashboardData={initialDashboardData as any}
      stages={stages.map((s) => ({ id: s.id, name: s.name }))}
      initialStageId={initialStageId}
      hideStageFilter={isStageManager}
    />
  );
}
