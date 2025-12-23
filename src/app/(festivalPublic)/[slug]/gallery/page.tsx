import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

export default async function GalleryPage({
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
      <h1 className="text-3xl font-bold mb-4">Gallery</h1>
      <p className="text-muted-foreground">
        Photos and videos for{" "}
        {edition
          ? edition.name || `${edition.number}th Edition`
          : festival.name}
        .
      </p>
    </div>
  );
}
