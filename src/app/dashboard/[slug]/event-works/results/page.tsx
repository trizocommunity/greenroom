import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsConsoleClient } from "@/components/dashboard/announcement/ResultsConsoleClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import {
  getPublishedResults,
  computeStandings,
  getStandingsContext,
} from "@/features/announcement/services/announcer.service";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";


export const metadata: Metadata = {
  title: "Results",
  description: "Published results and standings",
};

export default async function ResultsConsolePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (
    !context ||
    !["ANNOUNCER", "ADMIN", "OWNER", "SUPER_ADMIN"].includes(context.role)
  ) {
    notFound();
  }

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const tier = (festival.tier ?? "STANDARD") as Tier;
  const canUse = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );
  if (!canUse) notFound();

  const [published, standingsContext, liveStandings] = await Promise.all([
    getPublishedResults(festival.id),
    getStandingsContext(festival.id),
    computeStandings(festival.id, "published"),
  ]);

  const canUnpublish =
    context.role === "ADMIN" ||
    context.role === "OWNER" ||
    context.role === "SUPER_ADMIN";

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Results
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Published results and team standings.
        </p>
      </div>
      <ResultsConsoleClient
        festivalId={festival.id}
        festivalSlug={slug}
        published={published}
        liveStandings={liveStandings}
        standingsContext={standingsContext}
        canUnpublish={canUnpublish}
      />
    </div>
  );
}
