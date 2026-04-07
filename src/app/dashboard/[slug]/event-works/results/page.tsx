import type { Tier } from "@prisma/client";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ResultsExploreClient } from "@/components/dashboard/event-works/ResultsExploreClient";
import { filterProgrammesForEventWorks } from "@/server/services/programme-status.service";
import { getFestivalResultsDataBySlug } from "@/server/services/results.service";

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

  // BASIC excludes the dedicated Results page feature.
  if (tier === "BASIC") {
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
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre-Works to see them in Marks, Results, and Leaderboard."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-works/schedule`}
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
