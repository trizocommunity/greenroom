import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsExploreClient } from "@/components/dashboard/event-works/ResultsExploreClient";
import { EmptyState } from "@/components/common/EmptyState";
import { getFestivalResultsDataBySlug } from "@/server/services/results.service";
import { filterProgrammesForEventWorks } from "@/server/services/programme-status.service";
import type { Tier } from "@prisma/client";
import { Calendar, ListChecks } from "lucide-react";

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
  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes,
    tier,
  );

  if (eventWorksProgrammes.length === 0) {
    if (tier === "BASIC") {
      return (
        <EmptyState
          title="No Programmes"
          description="Add programmes and assign students to see results here."
          actionLabel="Go to Programmes"
          actionLink={`/dashboard/${slug}/pre-works/programmes`}
          icon={ListChecks}
        />
      );
    }
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Results</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Explore published results by programme.
          </p>
        </div>
      </ResultsExploreClient>
    </div>
  );
}
