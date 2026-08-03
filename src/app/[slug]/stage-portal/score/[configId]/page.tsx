import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StagePortalScorePageClient } from "@/components/judge/StagePortalScorePageClient";
import { getStagePortalSessionFromCookie } from "@/core/auth/stage-portal-session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

export const metadata: Metadata = {
  title: "Enter Scores — Stage Portal",
};

export default async function StagePortalScorePage({
  params,
}: {
  params: Promise<{ slug: string; configId: string }>;
}) {
  const { slug, configId } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, tier: true },
  });
  if (!festival) return notFound();

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    (festival.tier ?? "STANDARD") as any,
    "eventWorks.judgementUI",
  );
  if (!canUseJudging) return notFound();

  const session = await getStagePortalSessionFromCookie();
  if (!session || session.festivalId !== festival.id) {
    return notFound();
  }

  return <StagePortalScorePageClient configId={configId} festivalSlug={slug} />;
}
