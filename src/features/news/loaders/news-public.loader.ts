import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { cache } from "@/core/cache/instance";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalNews as newsTable,
} from "@/core/database/schema";

export type PublicNewsPost = {
  id: string;
  slug: string | null;
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
const PUBLIC_NEWS_TTL_MS = 10 * 60 * 1000;

/**
 * A page of published news posts, newest first.
 *
 * Posts carry their full `content`, so a festival with a busy news feed used
 * to ship every article inside the first HTML payload. The page size caps
 * that; further pages come from `/api/festivals/[slug]/news`.
 *
 * Page 1 is cached per festivalId for 10 minutes — append-only writes mean
 * stale pages are fine and the cache invalidates on every news write.
 * Pages 2+ bypass the cache (they're tiny and only hit by client pagination).
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

  if (page !== 1) {
    return loadPublicNewsPage(festivalSlug, page, pageSize);
  }

  const festivalId = await resolveFestivalId(festivalSlug);
  if (!festivalId) return null;

  return cache.wrap(keys.newsList(festivalId), PUBLIC_NEWS_TTL_MS, async () =>
    loadPublicNewsPage(festivalSlug, 1, pageSize),
  );
}

async function loadPublicNewsPage(
  festivalSlug: string,
  page: number,
  pageSize: number,
): Promise<PublicNewsData | null> {
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
        slug: true,
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
      slug: true,
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

export async function getPublicNewsPostBySlugString(
  festivalSlug: string,
  newsSlug: string,
): Promise<{
  festival: { name: string; slug: string; branding: unknown };
  post: PublicNewsPost;
} | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true, branding: true },
  });
  if (!festival) return null;

  const post = await db.query.festivalNews.findFirst({
    where: and(
      eq(newsTable.festivalId, festival.id),
      eq(newsTable.slug, newsSlug),
      isNotNull(newsTable.publishedAt),
    ),
    columns: {
      id: true,
      slug: true,
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
    festival: {
      name: festival.name,
      slug: festival.slug,
      branding: festival.branding,
    },
    post: post as PublicNewsPost,
  };
}

export async function getRelatedNews(
  festivalSlug: string,
  excludeNewsSlug: string,
  limit: number = 3,
): Promise<PublicNewsPost[]> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true },
  });
  if (!festival) return [];

  const posts = await db.query.festivalNews.findMany({
    where: and(
      eq(newsTable.festivalId, festival.id),
      isNotNull(newsTable.publishedAt),
      // we can't do `notEq` easily without importing it, so let's import `ne`
    ),
    orderBy: [desc(newsTable.publishedAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
    limit: limit + 1,
  });

  return (posts as any[])
    .filter((p) => p.slug !== excludeNewsSlug)
    .slice(0, limit) as PublicNewsPost[];
}

// Slug → festivalId resolver, cached separately so the news cache and media
// cache share the result for the same slug.
import { keys } from "@/core/redis/keys";

const SLUG_TO_ID_TTL_MS = 60 * 60 * 1000;

async function resolveFestivalId(festivalSlug: string): Promise<string | null> {
  const cacheKey = `${keys.slugFestival(festivalSlug)}:id`;
  const cached = await cache.get<string>(cacheKey);
  if (cached !== undefined) return cached;

  const row = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true },
  });
  if (!row) return null;

  await cache.set(cacheKey, row.id, { ttlMs: SLUG_TO_ID_TTL_MS });
  return row.id;
}
