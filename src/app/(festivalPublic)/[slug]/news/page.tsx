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
    <div className="min-h-screen bg-background">
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-eyebrow justify-center mb-3">Updates</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading">
            News &amp; updates
          </h1>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground leading-relaxed">
            Latest announcements and stories from {data.festival.name}.
          </p>
        </div>
        <PublicNewsView posts={data.posts} festivalSlug={data.festival.slug} />
      </section>
    </div>
  );
}
