"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { findFestivalById } from "@/server/models/festival.model";

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
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "news");
  if (!canManage) {
    return { success: false, error: "News is not available on your plan." };
  }

  await prisma.festivalNews.create({
    data: {
      festivalId,
      title: data.title,
      excerpt: data.excerpt ?? null,
      content: data.content,
      imageUrl: data.imageUrl ?? null,
      publishedAt: data.publishedAt ?? null,
    },
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
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await prisma.festivalNews.updateMany({
    where: { id: postId, festivalId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt }),
    },
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
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await prisma.festivalNews.deleteMany({
    where: { id: postId, festivalId },
  });

  revalidatePath(`/dashboard/${festival.slug}/content/news`);
  revalidatePath(`/${festival.slug}/news`);
  return { success: true };
}
