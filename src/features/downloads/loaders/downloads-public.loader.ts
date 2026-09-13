import { eq } from "drizzle-orm";
import { cache } from "@/core/cache/instance";
import { db } from "@/core/database/client";
import {
  downloadCategory,
  type downloadFileType,
  festivalDownload,
  festival as festivalTable,
} from "@/core/database/schema";
import { keys } from "@/core/redis/keys";

export type PublicDownload = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: (typeof downloadFileType.enumValues)[number];
  category: (typeof downloadCategory.enumValues)[number];
  publishedAt: string | null;
  createdAt: string;
};

export type PublicDownloadGroup = {
  category: (typeof downloadCategory.enumValues)[number];
  downloads: PublicDownload[];
};

export type PublicDownloadsData = {
  festival: { id: string; name: string; slug: string; branding: unknown };
  groups: PublicDownloadGroup[];
  total: number;
};

const PUBLIC_DOWNLOADS_TTL_MS = 10 * 60 * 1000;

const SLUG_TO_ID_TTL_MS = 60 * 60 * 1000;

async function resolveFestivalId(slug: string): Promise<string | null> {
  const cacheKey = `${keys.slugFestival(slug)}:id`;
  const cached = await cache.get<string>(cacheKey);
  if (cached !== undefined) return cached;

  const row = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true },
  });
  if (!row) return null;

  await cache.set(cacheKey, row.id, { ttlMs: SLUG_TO_ID_TTL_MS });
  return row.id;
}

/**
 * Published downloads for the public /[slug]/downloads page, grouped by
 * category. The list is append-only (no edits) and small in practice, so
 * one payload per festival is the simplest cache shape — fresh after every
 * write via `invalidatePublicFestivalCaches`.
 *
 * Group order follows `downloadCategory.enumValues`, which is the same
 * order admins see in the dashboard select.
 */
export async function getPublicDownloadsData(
  festivalSlug: string,
): Promise<PublicDownloadsData | null> {
  const festivalId = await resolveFestivalId(festivalSlug);
  if (!festivalId) return null;

  return cache.wrap(
    keys.downloadsList(festivalId),
    PUBLIC_DOWNLOADS_TTL_MS,
    async () => loadPublicDownloadsPage(festivalId),
  );
}

async function loadPublicDownloadsPage(
  festivalId: string,
): Promise<PublicDownloadsData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { id: true, name: true, slug: true, branding: true },
  });
  if (!festival) return null;

  const rows = await db.query.festivalDownload.findMany({
    where: eq(festivalDownload.festivalId, festivalId),
    columns: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      category: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  // Only published files appear publicly; drafts are admin-only.
  const published = rows.filter(
    (r) => r.publishedAt !== null,
  ) as PublicDownload[];

  const groups: PublicDownloadGroup[] = downloadCategory.enumValues.map(
    (cat) => ({
      category: cat,
      downloads: published
        .filter((d) => d.category === cat)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)),
    }),
  );

  // Drop empty groups so the public page never shows a heading with nothing
  // under it.
  return {
    festival,
    groups: groups.filter((g) => g.downloads.length > 0),
    total: published.length,
  };
}
