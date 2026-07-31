"use server";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalNews } from "@/core/database/schema";
import { parseInstant } from "@/core/datetime";
import { serverNowIso } from "@/core/datetime/server";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { StorageUsageService } from "@/features/festivals/services/storage-usage.service";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";

export async function getNewsPostsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const posts = await db.query.festivalNews.findMany({
    where: eq(festivalNews.festivalId, festivalId),
    orderBy: [desc(festivalNews.publishedAt)],
  });
  return posts;
}

export async function createNewsPostAction(
  festivalId: string,
  data: {
    title: string;
    excerpt?: string | null;
    content: string;
    imageUrl?: string | null;
    publishedAt?: Date | null;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "news");
  if (!canManage) {
    return { success: false, error: "News is not available on your plan." };
  }

  const addedMb = await StorageUsageService.getUrlSizeMB(data.imageUrl);
  await db.insert(festivalNews).values({
    id: randomUUID(),
    updatedAt: serverNowIso(),
    festivalId,
    title: data.title,
    excerpt: data.excerpt ?? null,
    content: data.content,
    imageUrl: data.imageUrl ?? null,
    publishedAt: parseInstant(data.publishedAt)?.toISOString() ?? null,
  });
  if (addedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}

export async function updateNewsPostAction(
  festivalId: string,
  postId: string,
  data: {
    title?: string;
    excerpt?: string | null;
    content?: string;
    imageUrl?: string | null;
    publishedAt?: Date | null;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const existing = await db.query.festivalNews.findFirst({
    where: and(
      eq(festivalNews.id, postId),
      eq(festivalNews.festivalId, festivalId),
    ),
    columns: { id: true, imageUrl: true },
  });
  if (!existing) return { success: false, error: "News post not found" };

  const nextImageUrl =
    data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl;
  const [addedMb, removedMb] = await Promise.all([
    data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl
      ? StorageUsageService.getUrlSizeMB(nextImageUrl)
      : Promise.resolve(0),
    data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl
      ? StorageUsageService.getUrlSizeMB(existing.imageUrl)
      : Promise.resolve(0),
  ]);
  const deltaMb = addedMb - removedMb;

  await db
    .update(festivalNews)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.publishedAt !== undefined && {
        publishedAt: parseInstant(data.publishedAt)?.toISOString() ?? null,
      }),
    })
    .where(eq(festivalNews.id, existing.id));

  if (deltaMb !== 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", deltaMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}

export async function deleteNewsPostAction(festivalId: string, postId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const existing = await db.query.festivalNews.findFirst({
    where: and(
      eq(festivalNews.id, postId),
      eq(festivalNews.festivalId, festivalId),
    ),
    columns: { id: true, imageUrl: true },
  });
  if (!existing) return { success: false, error: "News post not found" };
  const removedMb = await StorageUsageService.getUrlSizeMB(existing.imageUrl);
  await db.delete(festivalNews).where(eq(festivalNews.id, existing.id));
  if (removedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}
