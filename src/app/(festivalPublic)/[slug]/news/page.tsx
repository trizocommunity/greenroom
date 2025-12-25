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

  if (!data) return { title: "News Not Found" };

  const { festival, edition } = data;
  const currentEditionName = edition?.slug;
  const title = `News - ${currentEditionName ? `${festival.name} ${currentEditionName}` : festival.name}`;

  return {
    title: title,
    description: `Latest news and updates from ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Latest news and updates from ${festival.name}.`,
    },
  };
}

export default async function NewsPage({
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

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">News & Updates</h1>
      <p className="text-muted-foreground">
        Latest announcements for{" "}
        {edition ? edition.slug.toUpperCase() : festival.name}.
      </p>
    </div>
  );
}
