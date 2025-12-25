import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { edition: editionParam } = await searchParams;
  const data = await getPublicFestivalData(slug, editionParam);

  if (!data) return { title: "Results Not Found" };

  const { festival, edition } = data;
  const currentEditionName = edition?.slug;
  const title = `Results - ${currentEditionName ? `${festival.name} ${currentEditionName}` : festival.name}`;

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { slug } = await params;
  const { edition: editionParam } = await searchParams;

  const data = await getPublicFestivalData(slug, editionParam);

  if (!data) return notFound();
  const { festival, edition } = data;

  if (!edition) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Results</h1>
        <p className="text-muted-foreground">
          Results will be published here soon for {festival.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Results</h1>
      <p className="text-muted-foreground">
        Competition results for {edition.slug.toUpperCase()} will be published
        here.
      </p>
      {/* TODO: Fetch and display results for edition.id */}
    </div>
  );
}
