import "server-only";

import { randomUUID } from "crypto";
import { and, eq, max } from "drizzle-orm";
import { createMediaImageInput } from "@/api/contracts/media";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalMediaImage } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { StorageBackedFieldService } from "@/features/festivals/services/storage-backed-field.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    await assertFestivalAccess(user, festivalId);

    const images = await db.query.festivalMediaImage.findMany({
      where: eq(festivalMediaImage.festivalId, festivalId),
      orderBy: (t, { asc }) => [asc(t.order)],
    });
    return ok(images);
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createMediaImageInput.safeParse(data);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { festivalId, url } = parsed.data;
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const [{ maxOrder }] = await db
      .select({ maxOrder: max(festivalMediaImage.order) })
      .from(festivalMediaImage)
      .where(eq(festivalMediaImage.festivalId, festivalId));
    const order = (maxOrder ?? -1) + 1;

    const now = serverNowIso();
    const image = {
      id: randomUUID(),
      festivalId,
      url,
      order,
      createdAt: now,
      updatedAt: now,
    };

    await StorageBackedFieldService.mutateUrls({
      festivalId,
      add: [url],
      operation: async (tx) => {
        await tx.insert(festivalMediaImage).values(image);
      },
    });

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
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

    const image = await db.query.festivalMediaImage.findFirst({
      where: and(
        eq(festivalMediaImage.id, imageId),
        eq(festivalMediaImage.festivalId, festivalId),
      ),
    });
    if (!image) {
      return badRequest("NOT_FOUND", "Image not found");
    }

    await StorageBackedFieldService.mutateUrls({
      festivalId,
      remove: [image.url],
      operation: async (tx) => {
        await tx
          .delete(festivalMediaImage)
          .where(eq(festivalMediaImage.id, image.id));
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
export const DELETE = handler;
