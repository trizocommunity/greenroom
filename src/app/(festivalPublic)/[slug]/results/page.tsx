import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsList } from "@/components/festival/landing/ResultsList";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import { getPublicFestivalResults } from "@/features/festivals/loaders/festival-results.loader";

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

  // Fetch published results
  const results = await getPublicFestivalResults(festival.id);

  return (
    <div className="bg-background min-h-screen pt-20">
      <ResultsList
        festivalId={festival.id}
        festivalName={festival.name}
        accentColor={accentColor}
        results={results}
        teamStandings={festival.teamStandings as any[]}
        scoringSystem={festival.scoringSystem || "POSITION_BASED"}
      />
    </div>
  );
}
