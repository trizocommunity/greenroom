"use server";

import { randomUUID } from "crypto";
import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalMediaImage, festivalMediaVideo } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { invalidatePublicFestivalCaches } from "@/features/festivals/services/public-cache-invalidation";
import { StorageBackedFieldService } from "@/features/festivals/services/storage-backed-field.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";

export async function getMediaImagesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const images = await db.query.festivalMediaImage.findMany({
    where: eq(festivalMediaImage.festivalId, festivalId),
    orderBy: (t, { asc }) => [asc(t.order)],
  });
  return images;
}

export async function getMediaVideosAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const videos = await db.query.festivalMediaVideo.findMany({
    where: eq(festivalMediaVideo.festivalId, festivalId),
    orderBy: (t, { asc }) => [asc(t.order)],
  });
  return videos;
}

export async function addMediaImageAction(festivalId: string, url: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "media", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Media is not available on your plan." };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalMediaImage.order) })
    .from(festivalMediaImage)
    .where(eq(festivalMediaImage.festivalId, festivalId));
  const order = (maxOrder ?? -1) + 1;

  await StorageBackedFieldService.mutateUrls({
    festivalId,
    add: [url],
    operation: async (tx) => {
      await tx.insert(festivalMediaImage).values({
        id: randomUUID(),
        festivalId,
        url,
        order,
        updatedAt: serverNowIso(),
      });
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function addMediaImagesAction(festivalId: string, urls: string[]) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "media", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Media is not available on your plan." };
  if (urls.length === 0) return { success: true };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalMediaImage.order) })
    .from(festivalMediaImage)
    .where(eq(festivalMediaImage.festivalId, festivalId));
  let order = (maxOrder ?? -1) + 1;

  const now = serverNowIso();
  await StorageBackedFieldService.mutateUrls({
    festivalId,
    add: urls,
    operation: async (tx) => {
      await tx.insert(festivalMediaImage).values(
        urls.map((url) => ({
          id: randomUUID(),
          festivalId,
          url,
          order: order++,
          updatedAt: now,
        })),
      );
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function deleteMediaImageAction(
  festivalId: string,
  imageId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const image = await db.query.festivalMediaImage.findFirst({
    where: and(
      eq(festivalMediaImage.id, imageId),
      eq(festivalMediaImage.festivalId, festivalId),
    ),
    columns: { id: true, url: true },
  });
  if (!image) return { success: false, error: "Image not found" };
  await StorageBackedFieldService.mutateUrls({
    festivalId,
    remove: [image.url],
    operation: async (tx) => {
      await tx
        .delete(festivalMediaImage)
        .where(eq(festivalMediaImage.id, image.id));
    },
  });
  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function deleteMediaImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  if (imageIds.length === 0) return { success: true };
  const rows = await db.query.festivalMediaImage.findMany({
    where: and(
      inArray(festivalMediaImage.id, imageIds),
      eq(festivalMediaImage.festivalId, festivalId),
    ),
    columns: { id: true, url: true },
  });
  await StorageBackedFieldService.mutateUrls({
    festivalId,
    remove: rows.map((r) => r.url),
    operation: async (tx) => {
      await tx
        .delete(festivalMediaImage)
        .where(
          and(
            inArray(festivalMediaImage.id, imageIds),
            eq(festivalMediaImage.festivalId, festivalId),
          ),
        );
    },
  });
  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function reorderMediaImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  await db.transaction(async (tx) => {
    for (let index = 0; index < imageIds.length; index++) {
      await tx
        .update(festivalMediaImage)
        .set({ order: index })
        .where(
          and(
            eq(festivalMediaImage.id, imageIds[index]),
            eq(festivalMediaImage.festivalId, festivalId),
          ),
        );
    }
  });
  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}
