"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";

async function assertFestivalAdmin(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    include: {
      members: {
        where: { userId: session.userId, isActive: true },
      },
    },
  });
  const isOwner = festival?.ownerId === session.userId;
  const isAdmin = festival?.members.some((m) => m.role === "ADMIN");
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!festival || (!isOwner && !isAdmin && !isSuperAdmin)) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }
  return { festival, slug: festival.slug };
}

export async function addGalleryImageAction(festivalId: string, url: string) {
  try {
    const { slug } = await assertFestivalAdmin(festivalId);
    const maxOrder = await prisma.festivalGalleryImage.aggregate({
      where: { festivalId },
      _max: { order: true },
    });
    await prisma.festivalGalleryImage.create({
      data: {
        festivalId,
        url: url.trim(),
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    revalidatePath(`/dashboard/${slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function removeGalleryImageAction(imageId: string) {
  try {
    const image = await prisma.festivalGalleryImage.findUnique({
      where: { id: imageId },
      select: { festivalId: true, festival: { select: { slug: true } } },
    });
    if (!image) return { success: false, error: "Not found" };
    await assertFestivalAdmin(image.festivalId);
    await prisma.festivalGalleryImage.delete({ where: { id: imageId } });
    revalidatePath(`/dashboard/${image.festival.slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function addNewsPostAction(
  festivalId: string,
  data: { title: string; content: string; imageUrl?: string | null },
) {
  try {
    const { slug } = await assertFestivalAdmin(festivalId);
    await prisma.festivalNews.create({
      data: {
        festivalId,
        title: data.title.trim(),
        content: data.content.trim(),
        imageUrl: data.imageUrl?.trim() || null,
      },
    });
    revalidatePath(`/dashboard/${slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function removeNewsPostAction(postId: string) {
  try {
    const post = await prisma.festivalNews.findUnique({
      where: { id: postId },
      select: { festivalId: true, festival: { select: { slug: true } } },
    });
    if (!post) return { success: false, error: "Not found" };
    await assertFestivalAdmin(post.festivalId);
    await prisma.festivalNews.delete({ where: { id: postId } });
    revalidatePath(`/dashboard/${post.festival.slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}
