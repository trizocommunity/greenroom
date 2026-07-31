import { randomUUID } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { createScheduleEntryInput } from "@/api/contracts/schedule";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { scheduleEntry } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    await assertFestivalAccess(user, festivalId);

    const typeFilter = url.searchParams.get("typeFilter");
    const where = typeFilter
      ? and(
          eq(scheduleEntry.festivalId, festivalId),
          eq(scheduleEntry.type, typeFilter as "PROGRAMME" | "SESSION"),
        )
      : eq(scheduleEntry.festivalId, festivalId);

    const entries = await db.query.scheduleEntry.findMany({
      where,
      orderBy: [asc(scheduleEntry.startTime), asc(scheduleEntry.order)],
    });

    return ok(entries);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createScheduleEntryInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    const now = serverNowIso();
    const entry = await db
      .insert(scheduleEntry)
      .values({
        id: randomUUID(),
        festivalId,
        createdBy: user!.userId,
        updatedBy: user!.userId,
        updatedAt: now,
        ...parsed.data,
      })
      .returning();

    return ok(entry[0]);
  },
});

export const GET = handler;
export const POST = handler;
