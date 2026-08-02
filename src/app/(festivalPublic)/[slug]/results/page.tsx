import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsList } from "@/components/festival/landing/ResultsList";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import { getPublicProgrammeResults } from "@/features/festivals/loaders/festival-results.loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "Results Not Found" };

  const { festival } = data;
  const title = `Results - ${festival.name}`;

  return {
    title: title,
    description: `Competition results for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Competition results for ${festival.name}.`,
    },
  };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) return notFound();
  const { festival } = data;

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding
      ? (festival.branding as any).colors?.primary || "#000000"
      : "#000000";

  // Only the first page of programmes is rendered server-side; the client
  // pulls further pages from /api/festivals/[slug]/results on demand.
  const initialResults = await getPublicProgrammeResults(festival.id, {
    page: 1,
  });
  const teamStandings = (festival.teamStandings as any[]) ?? [];

  return (
    <div className="bg-background">
      <ResultsList
        festivalName={festival.name}
        festivalSlug={slug}
        accentColor={accentColor}
        initialResults={initialResults}
        teamStandings={teamStandings}
        scoringSystem={festival.scoringSystem || "POSITION_BASED"}
      />
    </div>
  );
}
