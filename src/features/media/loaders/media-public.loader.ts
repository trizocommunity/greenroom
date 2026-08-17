import { asc, count, eq } from "drizzle-orm";
import { cache } from "@/core/cache/instance";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalMediaImage as mediaImageTable,
  festivalMediaVideo as mediaVideoTable,
} from "@/core/database/schema";
import { keys } from "@/core/redis/keys";

export type PublicMediaItem = { id: string; url: string; order: number };

export type PublicMediaData = {
  festival: { id: string; name: string; slug: string };
  images: PublicMediaItem[];
  /** Videos are few by nature and always returned whole on the first page. */
  videos: PublicMediaItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export const PUBLIC_MEDIA_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const PUBLIC_MEDIA_TTL_MS = 10 * 60 * 1000;
const SLUG_TO_ID_TTL_MS = 60 * 60 * 1000;

/**
 * A page of gallery images.
 *
 * A festival can upload thousands of photos against its storage quota, and
 * every one of them used to arrive in the first payload — each becoming a
 * `next/image` request on paint. Images are paginated; videos are not, since
 * they are a handful of links and are only fetched with page 1.
 *
 * Page 1 is cached per festivalId for 10 minutes. Pages 2+ bypass the cache.
 */
export async function getPublicMediaData(
  festivalSlug: string,
  options?: { page?: number; pageSize?: number },
): Promise<PublicMediaData | null> {
  const page = Math.max(1, Math.trunc(options?.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(options?.pageSize ?? PUBLIC_MEDIA_PAGE_SIZE)),
  );

  if (page !== 1) {
    return loadPublicMediaPage(festivalSlug, page, pageSize);
  }

  const festivalId = await resolveFestivalId(festivalSlug);
  if (!festivalId) return null;

  return cache.wrap(keys.mediaList(festivalId), PUBLIC_MEDIA_TTL_MS, async () =>
    loadPublicMediaPage(festivalSlug, 1, pageSize),
  );
}

async function loadPublicMediaPage(
  festivalSlug: string,
  page: number,
  pageSize: number,
): Promise<PublicMediaData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const [images, totalRows, videos] = await Promise.all([
    db.query.festivalMediaImage.findMany({
      where: eq(mediaImageTable.festivalId, festival.id),
      orderBy: [asc(mediaImageTable.order), asc(mediaImageTable.id)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      columns: { id: true, url: true, order: true },
    }),
    db
      .select({ value: count() })
      .from(mediaImageTable)
      .where(eq(mediaImageTable.festivalId, festival.id)),
    page === 1
      ? db.query.festivalMediaVideo.findMany({
          where: eq(mediaVideoTable.festivalId, festival.id),
          orderBy: [asc(mediaVideoTable.order)],
          columns: { id: true, url: true, order: true },
        })
      : Promise.resolve([] as PublicMediaItem[]),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  return {
    festival,
    images,
    videos,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

async function resolveFestivalId(festivalSlug: string): Promise<string | null> {
  const cacheKey = `${keys.slugFestival(festivalSlug)}:id`;
  const cached = await cache.get<string>(cacheKey);
  if (cached !== null) return cached;

  const row = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true },
  });
  if (!row) return null;

  await cache.set(cacheKey, row.id, { ttlMs: SLUG_TO_ID_TTL_MS });
  return row.id;
}
