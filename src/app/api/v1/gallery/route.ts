import "server-only";

import { randomUUID } from "crypto";
import { and, eq, max } from "drizzle-orm";
import { createGalleryImageInput } from "@/api/contracts/gallery";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalGalleryImage } from "@/core/database/schema";
import { StorageUsageService } from "@/features/festivals/services/storage-usage.service";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    await assertFestivalAccess(user, festivalId);

    const images = await db.query.festivalGalleryImage.findMany({
      where: eq(festivalGalleryImage.festivalId, festivalId),
      orderBy: (t, { asc }) => [asc(t.order)],
    });
    return ok(images, "public, max-age=60, stale-while-revalidate=300");
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createGalleryImageInput.safeParse(data);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { festivalId, url } = parsed.data;
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const [{ maxOrder }] = await db
      .select({ maxOrder: max(festivalGalleryImage.order) })
      .from(festivalGalleryImage)
      .where(eq(festivalGalleryImage.festivalId, festivalId));
    const order = (maxOrder ?? -1) + 1;

    const addedMb = await StorageUsageService.getUrlSizeMB(url);
    const now = new Date().toISOString();
    const image = {
      id: randomUUID(),
      festivalId,
      url,
      order,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(festivalGalleryImage).values(image);
    if (addedMb > 0) {
      await UsageCounterService.incrementUsage(festivalId, "storage", addedMb);
    }

    return ok(image);
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const imageId = url.searchParams.get("imageId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!imageId) {
      return badRequest("MISSING_PARAM", "imageId is required");
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const image = await db.query.festivalGalleryImage.findFirst({
      where: and(
        eq(festivalGalleryImage.id, imageId),
        eq(festivalGalleryImage.festivalId, festivalId),
      ),
    });
    if (!image) {
      return badRequest("NOT_FOUND", "Image not found");
    }

    const removedMb = await StorageUsageService.getUrlSizeMB(image.url);
    await db
      .delete(festivalGalleryImage)
      .where(eq(festivalGalleryImage.id, image.id));
    if (removedMb > 0) {
      await UsageCounterService.incrementUsage(
        festivalId,
        "storage",
        -removedMb,
      );
    }

    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
