"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { festivalGalleryImage } from "@/server/db/schema";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { StorageUsageService } from "@/server/services/storage-usage.service";
import { UsageCounterService } from "@/server/services/usage-counter.service";
import { eq, and, max, inArray } from "drizzle-orm";

export async function getGalleryImagesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const images = await db.query.festivalGalleryImage.findMany({
    where: eq(festivalGalleryImage.festivalId, festivalId),
    orderBy: (t, { asc }) => [asc(t.order)],
  });
  return images;
}

export async function addGalleryImageAction(festivalId: string, url: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "gallery");
  if (!canManage)
    return { success: false, error: "Gallery is not available on your plan." };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalGalleryImage.order) })
    .from(festivalGalleryImage)
    .where(eq(festivalGalleryImage.festivalId, festivalId));
  const order = (maxOrder ?? -1) + 1;

  const addedMb = await StorageUsageService.getUrlSizeMB(url);
  await db.insert(festivalGalleryImage).values({ id: randomUUID(), festivalId, url, order, updatedAt: new Date().toISOString() });
  if (addedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function addGalleryImagesAction(
  festivalId: string,
  urls: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "gallery");
  if (!canManage)
    return { success: false, error: "Gallery is not available on your plan." };
  if (urls.length === 0) return { success: true };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalGalleryImage.order) })
    .from(festivalGalleryImage)
    .where(eq(festivalGalleryImage.festivalId, festivalId));
  let order = (maxOrder ?? -1) + 1;

  const addedMb = await StorageUsageService.getUrlsSizeMB(urls);
  const now = new Date().toISOString();
  await db.insert(festivalGalleryImage).values(
    urls.map((url) => ({ id: randomUUID(), festivalId, url, order: order++, updatedAt: now }))
  );
  if (addedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function deleteGalleryImageAction(
  festivalId: string,
  imageId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const image = await db.query.festivalGalleryImage.findFirst({
    where: and(eq(festivalGalleryImage.id, imageId), eq(festivalGalleryImage.festivalId, festivalId)),
    columns: { id: true, url: true },
  });
  if (!image) return { success: false, error: "Image not found" };
  const removedMb = await StorageUsageService.getUrlSizeMB(image.url);
  await db.delete(festivalGalleryImage).where(eq(festivalGalleryImage.id, image.id));
  if (removedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb);
  }
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function deleteGalleryImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  if (imageIds.length === 0) return { success: true };
  const rows = await db.query.festivalGalleryImage.findMany({
    where: and(inArray(festivalGalleryImage.id, imageIds), eq(festivalGalleryImage.festivalId, festivalId)),
    columns: { id: true, url: true },
  });
  const removedMb = await StorageUsageService.getUrlsSizeMB(rows.map((r) => r.url));
  await db.delete(festivalGalleryImage).where(
    and(inArray(festivalGalleryImage.id, imageIds), eq(festivalGalleryImage.festivalId, festivalId))
  );
  if (removedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb);
  }
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function reorderGalleryImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  await db.transaction(async (tx) => {
    for (let index = 0; index < imageIds.length; index++) {
      await tx.update(festivalGalleryImage)
        .set({ order: index })
        .where(and(eq(festivalGalleryImage.id, imageIds[index]), eq(festivalGalleryImage.festivalId, festivalId)));
    }
  });
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}
