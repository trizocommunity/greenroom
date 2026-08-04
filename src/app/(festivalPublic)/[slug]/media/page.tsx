import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { getPublicMediaData } from "@/features/media/loaders/media-public.loader";
import { PublicMediaView } from "./PublicMediaView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicMediaData(slug);
  if (!data) return { title: "Media Not Found" };
  const title = `Media - ${data.festival.name}`;
  const description = `Photos and moments from ${data.festival.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MediaPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicMediaData(slug);
  if (!data) return notFound();

  return (
    <PublicSection>
      <SectionHeader
        as="h1"
        eyebrow="Moments"
        title="Media"
        subtitle={`Photos and videos from ${data.festival.name}.`}
        className="mb-10"
      />
      <PublicMediaView
        images={data.images}
        videos={data.videos}
        total={data.total}
        hasMore={data.hasMore}
        pageSize={data.pageSize}
        festivalSlug={data.festival.slug}
      />
    </PublicSection>
  );
}
