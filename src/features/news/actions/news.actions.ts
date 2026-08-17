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
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { invalidatePublicFestivalCaches } from "@/features/festivals/services/public-cache-invalidation";
import { StorageBackedFieldService } from "@/features/festivals/services/storage-backed-field.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";

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

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "news", effectiveFeatures);
  if (!canManage) {
    return { success: false, error: "News is not available on your plan." };
  }

  await StorageBackedFieldService.mutateUrls({
    festivalId,
    add: [data.imageUrl],
    operation: async (tx) => {
      await tx.insert(festivalNews).values({
        id: randomUUID(),
        updatedAt: serverNowIso(),
        festivalId,
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content,
        imageUrl: data.imageUrl ?? null,
        publishedAt: parseInstant(data.publishedAt)?.toISOString() ?? null,
      });
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
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

  await StorageBackedFieldService.mutateSingleUrl({
    festivalId,
    currentUrl: existing.imageUrl,
    nextUrl: nextImageUrl,
    operation: async (tx) => {
      await tx
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
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
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
  await StorageBackedFieldService.mutateUrls({
    festivalId,
    remove: [existing.imageUrl],
    operation: async (tx) => {
      await tx.delete(festivalNews).where(eq(festivalNews.id, existing.id));
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}
