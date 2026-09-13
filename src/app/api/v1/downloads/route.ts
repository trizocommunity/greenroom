import "server-only";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  createDownloadInput,
  updateDownloadInput,
} from "@/api/contracts/downloads";
import {
  badRequest,
  createProtectedHandler,
  forbidden,
  notFound,
  ok,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalDownload } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { invalidatePublicFestivalCaches } from "@/features/festivals/services/public-cache-invalidation";
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

    const rows = await db.query.festivalDownload.findMany({
      where: eq(festivalDownload.festivalId, festivalId),
      orderBy: [desc(festivalDownload.createdAt)],
    });

    return ok(rows);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createDownloadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
    const canManage = isEnabled(festival.tier, "downloads", effectiveFeatures);
    if (!canManage) {
      return forbidden("Downloads is not available on your plan.");
    }

    await db.insert(festivalDownload).values({
      id: randomUUID(),
      updatedAt: serverNowIso(),
      festivalId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fileUrl: parsed.data.fileUrl,
      fileType: parsed.data.fileType,
      category: parsed.data.category,
      publishedAt: parsed.data.publishedAt ?? null,
    });

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    await invalidatePublicFestivalCaches({
      festivalId,
      slug: festival.slug,
    });
    return ok({ success: true });
  },

  async PUT({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const downloadId = url.searchParams.get("downloadId");

    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!downloadId) {
      return badRequest("MISSING_PARAM", "downloadId is required");
    }

    const body = await request.json();
    const data = body.data ?? body;

    const parsed = updateDownloadInput.safeParse(data);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const existing = await db.query.festivalDownload.findFirst({
      where: and(
        eq(festivalDownload.id, downloadId),
        eq(festivalDownload.festivalId, festivalId),
      ),
      columns: { id: true },
    });
    if (!existing) {
      return notFound("NOT_FOUND", "Download not found");
    }

    await db
      .update(festivalDownload)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileType !== undefined && { fileType: data.fileType }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.publishedAt !== undefined && {
          publishedAt: data.publishedAt,
        }),
        updatedAt: serverNowIso(),
      })
      .where(eq(festivalDownload.id, existing.id));

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    await invalidatePublicFestivalCaches({
      festivalId,
      slug: festival.slug,
    });
    return ok({ success: true });
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const downloadId = url.searchParams.get("downloadId");

    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!downloadId) {
      return badRequest("MISSING_PARAM", "downloadId is required");
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const festival = await findFestivalById(festivalId);
    if (!festival) {
      return notFound("NOT_FOUND", "Festival not found");
    }

    const existing = await db.query.festivalDownload.findFirst({
      where: and(
        eq(festivalDownload.id, downloadId),
        eq(festivalDownload.festivalId, festivalId),
      ),
      columns: { id: true },
    });
    if (!existing) {
      return notFound("NOT_FOUND", "Download not found");
    }

    await db
      .delete(festivalDownload)
      .where(eq(festivalDownload.id, existing.id));

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    await invalidatePublicFestivalCaches({
      festivalId,
      slug: festival.slug,
    });
    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
