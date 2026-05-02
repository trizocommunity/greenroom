import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ResultsExploreClient } from "@/components/dashboard/event-works/ResultsExploreClient";
import type { Tier } from "@/core/types/app-enums";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { filterProgrammesForEventWorks } from "@/features/programmes/services/programme-status.service";
import { getFestivalResultsDataBySlug } from "@/features/results/services/results.service";

export const metadata: Metadata = {
  title: "Results",
  description: "Explore results of all programmes",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { festival } = await getFestivalResultsDataBySlug(slug);

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as Tier;

  // BASIC excludes the dedicated Results explore page; Standard/Pro require schedule-driven judging.
  if (tier === "BASIC") {
    return notFound();
  }

  const canUseDedicatedResults = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );
  if (!canUseDedicatedResults) {
    return notFound();
  }

  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes,
    tier,
  );

  if (eventWorksProgrammes.length === 0) {
    return (
      <EmptyState
        title="No programmes in Event Works yet"
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre Event Works to see them in Marks, Results, and Leaderboard."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-event-works/schedule`}
        icon={Calendar}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <ResultsExploreClient
        festival={{
          id: festival.id,
          name: festival.name,
          slug: festival.slug,
        }}
        programmes={eventWorksProgrammes}
        categories={festival.categories}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Results
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Explore published results by programme.
          </p>
        </div>
      </ResultsExploreClient>
    </div>
  );
}
