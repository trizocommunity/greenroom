"use server";

import { randomUUID } from "crypto";
import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalMediaImage, festivalMediaVideo } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { StorageUsageService } from "@/features/festivals/services/storage-usage.service";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";

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
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "media");
  if (!canManage)
    return { success: false, error: "Media is not available on your plan." };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalMediaImage.order) })
    .from(festivalMediaImage)
    .where(eq(festivalMediaImage.festivalId, festivalId));
  const order = (maxOrder ?? -1) + 1;

  const addedMb = await StorageUsageService.getUrlSizeMB(url);
  await db.insert(festivalMediaImage).values({
    id: randomUUID(),
    festivalId,
    url,
    order,
    updatedAt: serverNowIso(),
  });
  if (addedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
  return { success: true };
}

export async function addMediaImagesAction(festivalId: string, urls: string[]) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "media");
  if (!canManage)
    return { success: false, error: "Media is not available on your plan." };
  if (urls.length === 0) return { success: true };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(festivalMediaImage.order) })
    .from(festivalMediaImage)
    .where(eq(festivalMediaImage.festivalId, festivalId));
  let order = (maxOrder ?? -1) + 1;

  const addedMb = await StorageUsageService.getUrlsSizeMB(urls);
  const now = serverNowIso();
  await db.insert(festivalMediaImage).values(
    urls.map((url) => ({
      id: randomUUID(),
      festivalId,
      url,
      order: order++,
      updatedAt: now,
    })),
  );
  if (addedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
  }

  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
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
  const removedMb = await StorageUsageService.getUrlSizeMB(image.url);
  await db
    .delete(festivalMediaImage)
    .where(eq(festivalMediaImage.id, image.id));
  if (removedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb);
  }
  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
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
  const removedMb = await StorageUsageService.getUrlsSizeMB(
    rows.map((r) => r.url),
  );
  await db
    .delete(festivalMediaImage)
    .where(
      and(
        inArray(festivalMediaImage.id, imageIds),
        eq(festivalMediaImage.festivalId, festivalId),
      ),
    );
  if (removedMb > 0) {
    await UsageCounterService.incrementUsage(festivalId, "storage", -removedMb);
  }
  revalidatePath(`/dashboard/${festival.slug}/content/media`);
  revalidatePath(`/${festival.slug}/media`);
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
  return { success: true };
}
