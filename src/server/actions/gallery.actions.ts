"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { findFestivalById } from "@/server/models/festival.model";

export async function getGalleryImagesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const images = await prisma.festivalGalleryImage.findMany({
    where: { festivalId },
    orderBy: { order: "asc" },
  });
  return images;
}

export async function addGalleryImageAction(festivalId: string, url: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "gallery");
  if (!canManage)
    return { success: false, error: "Gallery is not available on your plan." };
  const maxOrder = await prisma.festivalGalleryImage.aggregate({
    where: { festivalId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;
  await prisma.festivalGalleryImage.create({
    data: { festivalId, url, order },
  });
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function addGalleryImagesAction(
  festivalId: string,
  urls: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  const canManage = await getEffectiveFeatureEnabled(festival.tier, "gallery");
  if (!canManage)
    return { success: false, error: "Gallery is not available on your plan." };
  if (urls.length === 0) return { success: true };
  const maxOrder = await prisma.festivalGalleryImage.aggregate({
    where: { festivalId },
    _max: { order: true },
  });
  let order = (maxOrder._max.order ?? -1) + 1;
  await prisma.festivalGalleryImage.createMany({
    data: urls.map((url) => ({ festivalId, url, order: order++ })),
  });
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function deleteGalleryImageAction(
  festivalId: string,
  imageId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  await prisma.festivalGalleryImage.deleteMany({
    where: { id: imageId, festivalId },
  });
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function deleteGalleryImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  if (imageIds.length === 0) return { success: true };
  await prisma.festivalGalleryImage.deleteMany({
    where: { id: { in: imageIds }, festivalId },
  });
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}

export async function reorderGalleryImagesAction(
  festivalId: string,
  imageIds: string[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };
  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.festivalGalleryImage.updateMany({
        where: { id, festivalId },
        data: { order: index },
      }),
    ),
  );
  revalidatePath(`/dashboard/${festival.slug}/content/gallery`);
  revalidatePath(`/${festival.slug}/gallery`);
  return { success: true };
}
