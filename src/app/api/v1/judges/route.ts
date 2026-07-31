import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { judgeInput } from "@/api/contracts/judges";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import {
  judgeStageAssignment,
  judge as judgeTable,
  stage as stageTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { listFestivalJudgesWithAssignments } from "@/features/judges/repositories/judge.repository";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const data = await listFestivalJudgesWithAssignments(festivalId);
    return ok(data);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = judgeInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const name = parsed.data.name.trim();
    if (!name) return badRequest("INVALID_INPUT", "Judge name is required");

    const existing = await db.query.judge.findMany({
      where: eq(judgeTable.festivalId, festivalId),
      columns: { id: true, name: true },
    });
    const normalizedName = name.toLocaleLowerCase().replace(/\s+/g, " ");
    const conflict = existing.find(
      (j) => j.name.toLocaleLowerCase().replace(/\s+/g, " ") === normalizedName,
    );
    if (conflict)
      return badRequest("CONFLICT", "A judge with this name already exists");

    const now = serverNowIso();
    const [created] = await db
      .insert(judgeTable)
      .values({
        id: randomUUID(),
        festivalId,
        name,
        description: parsed.data.description?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (created && parsed.data.stageIds?.length) {
      const validStages = await db.query.stage.findMany({
        where: and(
          eq(stageTable.festivalId, festivalId),
          inArray(stageTable.id, parsed.data.stageIds),
        ),
        columns: { id: true },
      });
      if (validStages.length > 0) {
        await db.insert(judgeStageAssignment).values(
          validStages.map((s) => ({
            id: randomUUID(),
            festivalId,
            stageId: s.id,
            judgeId: created.id,
          })),
        );
      }
    }

    return ok(created);
  },
});

export { handler as GET, handler as POST };
