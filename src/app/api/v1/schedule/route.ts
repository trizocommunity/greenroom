import { randomUUID } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { createScheduleEntryInput } from "@/api/contracts/schedule";
import {
  badRequest,
  createProtectedHandler,
  forbidden,
  ok,
  type SessionPayload,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { scheduleEntry } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

async function buildScopedWhere(
  festivalId: string,
  user: SessionPayload | null,
  typeFilter: "PROGRAMME" | "SESSION" | null,
) {
  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    user,
  );
  const baseFilters = typeFilter
    ? and(
        eq(scheduleEntry.festivalId, festivalId),
        eq(scheduleEntry.type, typeFilter),
      )
    : eq(scheduleEntry.festivalId, festivalId);
  if (accessibleStageIds === "all") return baseFilters;
  if (accessibleStageIds.length > 0) {
    return and(baseFilters, inArray(scheduleEntry.stageId, accessibleStageIds));
  }
  return and(baseFilters, inArray(scheduleEntry.id, ["__none__"]));
}

async function stageWriteForbidden(
  festivalId: string,
  user: SessionPayload | null,
  stageId: string | null | undefined,
): Promise<Response | null> {
  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    user,
  );
  if (accessibleStageIds === "all") return null;
  if (stageId && accessibleStageIds.includes(stageId)) return null;
  return forbidden("You can only schedule on your assigned stages.");
}

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    await assertFestivalAccess(user, festivalId);

    const rawType = url.searchParams.get("typeFilter");
    const typeFilter: "PROGRAMME" | "SESSION" | null =
      rawType === "PROGRAMME" || rawType === "SESSION" ? rawType : null;

    const where = await buildScopedWhere(festivalId, user, typeFilter);

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

    const stageGuard = await stageWriteForbidden(
      festivalId,
      user,
      parsed.data.stageId ?? null,
    );
    if (stageGuard) return stageGuard;

    if (parsed.data.type === "PROGRAMME" && parsed.data.programmeId) {
      const existing = await db.query.scheduleEntry.findFirst({
        where: and(
          eq(scheduleEntry.festivalId, festivalId),
          eq(scheduleEntry.type, "PROGRAMME"),
          eq(scheduleEntry.programmeId, parsed.data.programmeId),
        ),
        columns: { id: true },
      });
      if (existing) {
        return badRequest(
          "PROGRAMME_ALREADY_SCHEDULED",
          "That programme is already scheduled.",
        );
      }
    }

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
