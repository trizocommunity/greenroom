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

  if (!data) return { title: "Sessions Not Found" };

  const { festival, edition } = data;
  const currentEditionName = edition?.slug;
  const title = `Sessions - ${currentEditionName ? `${festival.name} ${currentEditionName}` : festival.name}`;

  return {
    title: title,
    description: `Program schedule for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Program schedule for ${festival.name}.`,
    },
  };
}

export default async function SessionsPage({
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
        <h1 className="text-3xl font-bold mb-4">Sessions</h1>
        <p className="text-muted-foreground">
          Sessions will be announced soon for {festival.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sessions</h1>
      <p className="text-muted-foreground">
        Schedule and program details for {edition.slug.toUpperCase()} of{" "}
        {festival.name}.
      </p>
      {/* TODO: Fetch and display sessions specifically for edition.id */}
    </div>
  );
}
