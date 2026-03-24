"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { findFestivalById } from "@/server/models/festival.model";
import { StorageUsageService } from "@/server/services/storage-usage.service";
import { UsageCounterService } from "@/server/services/usage-counter.service";

export async function getNewsPostsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const posts = await prisma.festivalNews.findMany({
    where: { festivalId },
    orderBy: { publishedAt: "desc" },
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
  await prisma.$transaction(async (tx) => {
    await tx.festivalNews.create({
      data: {
        festivalId,
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content,
        imageUrl: data.imageUrl ?? null,
        publishedAt: data.publishedAt ?? null,
      },
    });
    if (addedMb > 0) {
      await UsageCounterService.incrementUsage(festivalId, "storage", addedMb, tx);
    }
  });

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

  const existing = await prisma.festivalNews.findFirst({
    where: { id: postId, festivalId },
    select: { id: true, imageUrl: true },
  });
  if (!existing) return { success: false, error: "News post not found" };

  const nextImageUrl = data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl;
  const [addedMb, removedMb] = await Promise.all([
    data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl
      ? StorageUsageService.getUrlSizeMB(nextImageUrl)
      : Promise.resolve(0),
    data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl
      ? StorageUsageService.getUrlSizeMB(existing.imageUrl)
      : Promise.resolve(0),
  ]);
  const deltaMb = addedMb - removedMb;

  await prisma.$transaction(async (tx) => {
    await tx.festivalNews.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt }),
      },
    });
    if (deltaMb !== 0) {
      await UsageCounterService.incrementUsage(festivalId, "storage", deltaMb, tx);
    }
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}

export async function deleteNewsPostAction(
  festivalId: string,
  postId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const existing = await prisma.festivalNews.findFirst({
    where: { id: postId, festivalId },
    select: { id: true, imageUrl: true },
  });
  if (!existing) return { success: false, error: "News post not found" };
  const removedMb = await StorageUsageService.getUrlSizeMB(existing.imageUrl);
  await prisma.$transaction(async (tx) => {
    await tx.festivalNews.delete({ where: { id: existing.id } });
    if (removedMb > 0) {
      await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb, tx);
    }
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}
