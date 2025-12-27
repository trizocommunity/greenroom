import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

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

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Results</h1>
      <p className="text-muted-foreground">
        Competition results for {festival.name} will be published here.
      </p>
      {/* TODO: Fetch and display results */}
    </div>
  );
}
