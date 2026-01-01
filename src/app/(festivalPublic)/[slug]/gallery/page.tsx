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

  if (!data) return { title: "Gallery Not Found" };

  const { festival } = data;
  const title = `Gallery - ${festival.name}`;

  return {
    title: title,
    description: `Photos and videos from ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Photos and videos from ${festival.name}.`,
    },
  };
}

export default async function GalleryPage({
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
      <h1 className="text-3xl font-bold mb-4">Gallery</h1>
      <p className="text-muted-foreground">
        Photos and videos for {festival.name}.
      </p>
    </div>
  );
}
