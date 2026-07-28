import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { judgeInput } from "@/api/contracts/judges";
import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  judge as judgeTable,
  judgeStageAssignment,
  stage as stageTable,
} from "@/core/database/schema";

export const PUT = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  const body = await req.json();
  const data = body.data ?? body;

  const parsed = judgeInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const name = parsed.data.name.trim();
  if (!name) return badRequest("INVALID_INPUT", "Judge name is required");

  const existing = await db.query.judge.findFirst({
    where: eq(judgeTable.id, id),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("JUDGE_NOT_FOUND", "Judge not found");
  }

  const normalizedName = name.toLocaleLowerCase().replace(/\s+/g, " ");
  const conflict = await db.query.judge.findFirst({
    where: eq(judgeTable.festivalId, festivalId),
    columns: { id: true, name: true },
  });
  if (
    conflict &&
    conflict.name.toLocaleLowerCase().replace(/\s+/g, " ") === normalizedName &&
    conflict.id !== id
  ) {
    return badRequest("CONFLICT", "A judge with this name already exists");
  }

  const [updated] = await db
    .update(judgeTable)
    .set({
      name,
      description: parsed.data.description?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(judgeTable.id, id))
    .returning();

  if (parsed.data.stageIds !== undefined) {
    await db
      .delete(judgeStageAssignment)
      .where(eq(judgeStageAssignment.judgeId, id));

    if (parsed.data.stageIds.length > 0) {
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
            judgeId: id,
          })),
        );
      }
    }
  }

  return ok(updated);
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: judgeId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const existing = await db.query.judge.findFirst({
    where: eq(judgeTable.id, judgeId),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("JUDGE_NOT_FOUND", "Judge not found");
  }

  await db.delete(judgeTable).where(eq(judgeTable.id, judgeId));
  return ok({ success: true });
};
