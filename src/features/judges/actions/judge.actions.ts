"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { judge as judgeTable } from "@/core/database/schema";

export async function getJudgesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return db.query.judge.findMany({
    where: eq(judgeTable.festivalId, festivalId),
    orderBy: [asc(judgeTable.name)],
  });
}

export async function createJudgeAction(
  festivalId: string,
  input: { name: string; description?: string | null },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const name = input.name.trim();
  if (!name) throw new Error("Judge name is required.");

  const now = new Date().toISOString();
  const [created] = await db
    .insert(judgeTable)
    .values({
      id: randomUUID(),
      festivalId,
      name,
      description: input.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    } as any)
    .returning();
  return created;
}

export async function updateJudgeAction(
  festivalId: string,
  judgeId: string,
  input: { name: string; description?: string | null },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const name = input.name.trim();
  if (!name) throw new Error("Judge name is required.");

  const now = new Date().toISOString();
  const [updated] = await db
    .update(judgeTable)
    .set({
      name,
      description: input.description?.trim() || null,
      updatedAt: now,
    })
    .where(and(eq(judgeTable.id, judgeId), eq(judgeTable.festivalId, festivalId)))
    .returning();
  if (!updated) throw new Error("Judge not found.");
  return updated;
}

export async function deleteJudgeAction(festivalId: string, judgeId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  await db
    .delete(judgeTable)
    .where(and(eq(judgeTable.id, judgeId), eq(judgeTable.festivalId, festivalId)));
  return { success: true };
}

