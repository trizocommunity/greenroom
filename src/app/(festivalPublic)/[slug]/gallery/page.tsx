import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicGalleryData } from "@/features/gallery/loaders/gallery-public.loader";
import { PublicGalleryView } from "./PublicGalleryView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicGalleryData(slug);
  if (!data) return { title: "Gallery Not Found" };
  const title = `Gallery - ${data.festival.name}`;
  const description = `Photos and moments from ${data.festival.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicGalleryData(slug);
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container py-12 sm:py-16 px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Gallery
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Photos and moments from {data.festival.name}.
          </p>
        </div>
        <PublicGalleryView images={data.images} />
      </section>
    </div>
  );
}
