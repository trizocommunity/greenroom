import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalNews as newsTable,
} from "@/core/database/schema";

export type PublicNewsPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type PublicNewsData = {
  /** `branding` is carried so the news page can tint placeholders and links
      with the festival's own accent colour without a second query. */
  festival: { id: string; name: string; slug: string; branding: unknown };
  posts: PublicNewsPost[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export const PUBLIC_NEWS_PAGE_SIZE = 10;
const MAX_NEWS_PAGE_SIZE = 50;

/**
 * A page of published news posts, newest first.
 *
 * Posts carry their full `content`, so a festival with a busy news feed used
 * to ship every article inside the first HTML payload. The page size caps
 * that; further pages come from `/api/festivals/[slug]/news`.
 */
export async function getPublicNewsData(
  festivalSlug: string,
  options?: { page?: number; pageSize?: number },
): Promise<PublicNewsData | null> {
  const page = Math.max(1, Math.trunc(options?.page ?? 1));
  const pageSize = Math.min(
    MAX_NEWS_PAGE_SIZE,
    Math.max(1, Math.trunc(options?.pageSize ?? PUBLIC_NEWS_PAGE_SIZE)),
  );

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true, branding: true },
  });
  if (!festival) return null;

  const where = and(
    eq(newsTable.festivalId, festival.id),
    isNotNull(newsTable.publishedAt),
  );

  const [posts, totalRows] = await Promise.all([
    db.query.festivalNews.findMany({
      where,
      orderBy: [desc(newsTable.publishedAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      columns: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    db.select({ value: count() }).from(newsTable).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  return {
    festival,
    posts: posts as PublicNewsPost[],
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function getPublicNewsPostBySlug(
  festivalSlug: string,
  postId: string,
): Promise<{
  festival: { name: string; slug: string };
  post: PublicNewsPost;
} | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const post = await db.query.festivalNews.findFirst({
    where: and(
      eq(newsTable.festivalId, festival.id),
      eq(newsTable.id, postId),
      isNotNull(newsTable.publishedAt),
    ),
    columns: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  if (!post) return null;

  return {
    festival: { name: festival.name, slug: festival.slug },
    post: post as PublicNewsPost,
  };
}
