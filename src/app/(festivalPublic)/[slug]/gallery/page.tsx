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
    <div className="min-h-screen bg-background">
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-eyebrow justify-center mb-3">Moments</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading">
            Gallery
          </h1>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground leading-relaxed">
            Photos and moments from {data.festival.name}.
          </p>
        </div>
        <PublicGalleryView images={data.images} />
      </section>
    </div>
  );
}
