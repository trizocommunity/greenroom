import "server-only";

import { randomUUID } from "crypto";
import { and, eq, max } from "drizzle-orm";
import { createMediaVideoInput } from "@/api/contracts/media";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalMediaVideo } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { extractYouTubeId } from "@/features/media/utils/youtube";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    await assertFestivalAccess(user, festivalId);

    const videos = await db.query.festivalMediaVideo.findMany({
      where: eq(festivalMediaVideo.festivalId, festivalId),
      orderBy: (t, { asc }) => [asc(t.order)],
    });
    return ok(videos);
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createMediaVideoInput.safeParse(data);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { festivalId, url } = parsed.data;
    if (!extractYouTubeId(url)) {
      return badRequest("INVALID_INPUT", "Not a valid YouTube link");
    }
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const [{ maxOrder }] = await db
      .select({ maxOrder: max(festivalMediaVideo.order) })
      .from(festivalMediaVideo)
      .where(eq(festivalMediaVideo.festivalId, festivalId));
    const order = (maxOrder ?? -1) + 1;

    const now = serverNowIso();
    const video = {
      id: randomUUID(),
      festivalId,
      url,
      order,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(festivalMediaVideo).values(video);
    return ok(video);
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const videoId = url.searchParams.get("videoId");
    if (!festivalId) {
      return badRequest("MISSING_PARAM", "festivalId is required");
    }
    if (!videoId) {
      return badRequest("MISSING_PARAM", "videoId is required");
    }

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    await db
      .delete(festivalMediaVideo)
      .where(
        and(
          eq(festivalMediaVideo.id, videoId),
          eq(festivalMediaVideo.festivalId, festivalId),
        ),
      );

    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
