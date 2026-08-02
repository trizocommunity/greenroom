import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StagePortalHomeClient } from "@/components/judge/StagePortalHomeClient";
import { StagePortalLoginClient } from "@/components/judge/StagePortalLoginClient";
import { getStagePortalSessionFromCookie } from "@/core/auth/stage-portal-session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

export const metadata: Metadata = {
  title: "Stage Judge Portal",
};

export default async function StagePortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    return <StagePortalLoginClient festivalSlug={slug} />;
  }

  return <StagePortalHomeClient />;
}
