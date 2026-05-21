import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JudgmentWizardClient } from "@/components/dashboard/judgment/JudgmentWizardClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getJudgmentDashboardDataAction } from "@/features/judgment/actions/judgment.actions";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

export const metadata: Metadata = {
  title: "Judgment",
};

export default async function JudgmentPage({
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
    "eventWorks.judgmentUI",
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

  const initialDashboardData = await getJudgmentDashboardDataAction(
    festival.id,
  );

  return (
    <JudgmentWizardClient
      festivalId={festival.id}
      initialDashboardData={initialDashboardData as any}
    />
  );
}
