"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalMediaImage as mediaTable,
  festivalMember as memberTable,
  festivalNews as newsTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

async function assertFestivalAdmin(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    with: {
      festivalMembers: {
        where: and(
          eq(memberTable.userId, session.userId),
          eq(memberTable.isActive, true),
        ),
      },
    },
  });

  const isOwner = festival?.ownerId === session.userId;
  const isAdmin = festival?.festivalMembers.some((m) => m.role === "ADMIN");
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (!festival || (!isOwner && !isAdmin && !isSuperAdmin)) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }
  return { festival, slug: festival.slug };
}

export async function addMediaImageAction(festivalId: string, url: string) {
  try {
    const { slug } = await assertFestivalAdmin(festivalId);
    await assertFestivalMutationAllowed(festivalId);

    const [maxOrderResult] = await db
      .select({ maxOrder: sql<number>`max(${mediaTable.order})` })
      .from(mediaTable)
      .where(eq(mediaTable.festivalId, festivalId));

    const { randomUUID } = await import("crypto");
    await db.insert(mediaTable).values({
      id: randomUUID(),
      festivalId,
      url: url.trim(),
      order: (maxOrderResult.maxOrder ?? -1) + 1,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath(`/dashboard/${slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function removeMediaImageAction(imageId: string) {
  try {
    const image = await db.query.festivalMediaImage.findFirst({
      where: eq(mediaTable.id, imageId),
      with: { festival: { columns: { slug: true } } },
    });

    if (!image) return { success: false, error: "Not found" };
    await assertFestivalAdmin(image.festivalId);
    await assertFestivalMutationAllowed(image.festivalId);

    await db.delete(mediaTable).where(eq(mediaTable.id, imageId));
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
    await assertFestivalMutationAllowed(festivalId);

    const { randomUUID } = await import("crypto");
    await db.insert(newsTable).values({
      id: randomUUID(),
      festivalId,
      title: data.title.trim(),
      content: data.content.trim(),
      imageUrl: data.imageUrl?.trim() || null,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath(`/dashboard/${slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function removeNewsPostAction(postId: string) {
  try {
    const post = await db.query.festivalNews.findFirst({
      where: eq(newsTable.id, postId),
      with: { festival: { columns: { slug: true } } },
    });

    if (!post) return { success: false, error: "Not found" };
    await assertFestivalAdmin(post.festivalId);
    await assertFestivalMutationAllowed(post.festivalId);

    await db.delete(newsTable).where(eq(newsTable.id, postId));
    revalidatePath(`/dashboard/${post.festival.slug}/festival-live`);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
}
