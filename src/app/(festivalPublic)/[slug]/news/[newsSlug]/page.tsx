import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsImage } from "@/components/festival/public/NewsImage";
import { PublicSection } from "@/components/festival/public/PublicSection";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  getPublicNewsPostBySlugString,
  getRelatedNews,
} from "@/features/news/loaders/news-public.loader";
import { NewsShareButtons } from "./NewsShareButtons";

type Props = { params: Promise<{ slug: string; newsSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, newsSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) {
    return { title: "News Not Found" };
  }
  const data = await getPublicNewsPostBySlugString(slug, newsSlug);
  if (!data) return { title: "News Not Found" };

  const title = `${data.post.title} | ${data.festival.name}`;
  const description =
    data.post.excerpt ||
    data.post.content?.slice(0, 160) ||
    `Latest news and updates from ${data.festival.name}.`;
  const image = data.post.imageUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
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

export default async function NewsDetailsPage({ params }: Props) {
  const { slug, newsSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival || isFestivalExpired(festival)) return notFound();

  const data = await getPublicNewsPostBySlugString(slug, newsSlug);
  if (!data) return notFound();

  const relatedNews = await getRelatedNews(slug, newsSlug, 3);

  const post = data.post;

  const branding = data.festival.branding;
  const accentColor =
    branding && typeof branding === "object" && "colors" in branding
      ? ((branding as { colors?: { primary?: string } }).colors?.primary ??
        "var(--primary)")
      : "var(--primary)";

  return (
    <PublicSection className="max-w-3xl mx-auto py-12 px-4">
      <Link
        href={`/${slug}/news`}
        className="text-sm hover:underline mb-8 inline-block opacity-70"
      >
        &larr; Back to News
      </Link>
      <article className="mb-16">
        <h1 className="text-4xl md:text-5xl font-display font-semibold mb-6">
          {post.title}
        </h1>
        {post.publishedAt && (
          <p className="text-sm opacity-70 mb-8">
            {format(new Date(post.publishedAt), "MMMM d, yyyy")}
          </p>
        )}

        {post.imageUrl && (
          <div className="w-full aspect-video relative rounded-xl overflow-hidden mb-10">
            <NewsImage src={post.imageUrl} title={post.title} accentColor={accentColor} />
          </div>
        )}

        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is from rich text editor */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is from rich text editor
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="border-t pt-8">
          <h3 className="font-semibold mb-4">Share this article</h3>
          <NewsShareButtons title={post.title} />
        </div>
      </article>

      {relatedNews.length > 0 && (
        <div className="border-t pt-12">
          <h2 className="text-2xl font-display font-semibold mb-8">
            Related News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedNews.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                href={`/${slug}/news/${relatedPost.slug || relatedPost.id}`}
                className="group block"
              >
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3 relative">
                  {relatedPost.imageUrl ? (
                    <NewsImage
                      src={relatedPost.imageUrl}
                      title={relatedPost.title}
                      accentColor={accentColor}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-accent/10"
                      style={{ backgroundColor: `${accentColor}1A` }}
                    />
                  )}
                </div>
                <h4 className="font-semibold group-hover:underline line-clamp-2">
                  {relatedPost.title}
                </h4>
                {relatedPost.publishedAt && (
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(relatedPost.publishedAt), "MMM d, yyyy")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </PublicSection>
  );
}
