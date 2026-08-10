import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StagePortalHomeClient } from "@/components/judge/StagePortalHomeClient";
import { StagePortalLoginClient } from "@/components/judge/StagePortalLoginClient";
import { getStagePortalSessionFromCookie } from "@/core/auth/stage-portal-session";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";
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
  const hdrs = await headers();
  const institutionId = hdrs.get("x-institution-id");

  const festival = await findFestivalBySlugForPublic(slug, institutionId);
  if (!festival) return notFound();

  if (isFestivalExpired(festival)) {
    return notFound();
  }

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
