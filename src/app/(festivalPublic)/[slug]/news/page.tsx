import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicNewsData } from "@/features/news/loaders/news-public.loader";
import { PublicNewsView } from "./PublicNewsView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
  const data = await getPublicNewsData(slug);
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container py-12 sm:py-16 px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            News & Updates
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Latest announcements and stories from {data.festival.name}.
          </p>
        </div>
        <PublicNewsView posts={data.posts} festivalSlug={data.festival.slug} />
      </section>
    </div>
  );
}
