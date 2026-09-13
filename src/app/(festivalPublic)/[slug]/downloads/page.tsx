import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicDownloadsData } from "@/features/downloads/loaders/downloads-public.loader";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { PublicDownloadsView } from "./PublicDownloadsView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) {
    return { title: "Downloads Not Found" };
  }
  const data = await getPublicDownloadsData(slug);
  if (!data) return { title: "Downloads Not Found" };

  const title = `Downloads - ${data.festival.name}`;
  const description = `Brochures, schedules, rules, and other documents from ${data.festival.name}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function DownloadsPage({ params }: Props) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) return notFound();

  const data = await getPublicDownloadsData(slug);
  if (!data) return notFound();

  const branding = data.festival.branding;
  const accentColor =
    branding && typeof branding === "object" && "colors" in branding
      ? ((branding as { colors?: { primary?: string } }).colors?.primary ??
        "var(--primary)")
      : "var(--primary)";

  return (
    <PublicDownloadsView
      groups={data.groups}
      total={data.total}
      festivalSlug={data.festival.slug}
      accentColor={accentColor}
    />
  );
}
