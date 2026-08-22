import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getPublicNewsData } from "@/features/news/loaders/news-public.loader";
import { PublicNewsView } from "./PublicNewsView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) {
    return { title: "News Not Found" };
  }
  const data = await getPublicNewsData(slug);
  if (!data) return { title: "News Not Found" };
  const title = `News - ${data.festival.name}`;
  const description =
    data.posts[0]?.excerpt ||
    data.posts[0]?.content?.slice(0, 160) ||
    `Latest news and updates from ${data.festival.name}.`;
  const image = data.posts[0]?.imageUrl;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function NewsPage({ params }: Props) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) return notFound();

  const data = await getPublicNewsData(slug);
  if (!data) return notFound();

  const branding = data.festival.branding;
  const accentColor =
    branding && typeof branding === "object" && "colors" in branding
      ? ((branding as { colors?: { primary?: string } }).colors?.primary ??
        "var(--primary)")
      : "var(--primary)";

  const { headers } = await import("next/headers");
  const { getFestivalLinkBase } = await import("@/features/institutions/lib/custom-domain");
  const h = await headers();
  const isCustomDomain = !!h.get("x-custom-domain");
  const linkBase = getFestivalLinkBase(slug, isCustomDomain);

  return (
    <PublicSection>
      <SectionHeader
        as="h1"
        eyebrow="Updates"
        title="News & updates"
        subtitle={`Announcements and stories from ${data.festival.name}.`}
        className="mb-10"
      />
      <PublicNewsView
        posts={data.posts}
        total={data.total}
        hasMore={data.hasMore}
        pageSize={data.pageSize}
        festivalSlug={data.festival.slug}
        linkBase={linkBase}
        accentColor={accentColor}
      />
    </PublicSection>
  );
}
