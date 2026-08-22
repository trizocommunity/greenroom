import "server-only";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { createNewsPostInput, updateNewsPostInput } from "@/api/contracts/news";
import {
  badRequest,
  createProtectedHandler,
  forbidden,
  notFound,
  ok,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalNews } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { StorageBackedFieldService } from "@/features/festivals/services/storage-backed-field.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }

    await assertFestivalAccess(user, festivalId);

    const posts = await db.query.festivalNews.findMany({
      where: eq(festivalNews.festivalId, festivalId),
      orderBy: [desc(festivalNews.publishedAt)],
    });

    return ok(posts);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createNewsPostInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
    const canManage = isEnabled(festival.tier, "news", effectiveFeatures);
    if (!canManage) {
      return forbidden("News is not available on your plan.");
    }

    await StorageBackedFieldService.mutateUrls({
      festivalId,
      add: [parsed.data.imageUrl],
      operation: async (tx) => {
        await tx.insert(festivalNews).values({
          id: randomUUID(),
          updatedAt: serverNowIso(),
          festivalId,
          title: parsed.data.title,
          slug: (await import("@/core/utils/slug")).slugify(parsed.data.title) || "news",
          excerpt: parsed.data.excerpt ?? null,
          content: parsed.data.content,
          imageUrl: parsed.data.imageUrl ?? null,
          publishedAt: parsed.data.publishedAt ?? null,
        });
      },
    });

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok({ success: true });
  },

  async PUT({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const postId = url.searchParams.get("postId");

    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!postId) {
      return badRequest("MISSING_PARAM", "postId is required");
    }

    const body = await request.json();
    const data = body.data ?? body;

    const parsed = updateNewsPostInput.safeParse(data);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const existing = await db.query.festivalNews.findFirst({
      where: and(
        eq(festivalNews.id, postId),
        eq(festivalNews.festivalId, festivalId),
      ),
      columns: { id: true, imageUrl: true },
    });
    if (!existing) {
      return notFound("NOT_FOUND", "News post not found");
    }

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
            ...(data.title !== undefined && { 
              title: data.title,
              slug: (await import("@/core/utils/slug")).slugify(data.title) || "news"
            }),
            ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
            ...(data.content !== undefined && { content: data.content }),
            ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
            ...(data.publishedAt !== undefined && {
              publishedAt: data.publishedAt,
            }),
          })
          .where(eq(festivalNews.id, existing.id));
      },
    });

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok({ success: true });
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const postId = url.searchParams.get("postId");

    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!postId) {
      return badRequest("MISSING_PARAM", "postId is required");
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const existing = await db.query.festivalNews.findFirst({
      where: and(
        eq(festivalNews.id, postId),
        eq(festivalNews.festivalId, festivalId),
      ),
      columns: { id: true, imageUrl: true },
    });
    if (!existing) {
      return notFound("NOT_FOUND", "News post not found");
    }

    await StorageBackedFieldService.mutateUrls({
      festivalId,
      remove: [existing.imageUrl],
      operation: async (tx) => {
        await tx.delete(festivalNews).where(eq(festivalNews.id, existing.id));
      },
    });

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
