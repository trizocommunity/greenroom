"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { judge as judgeTable } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { listFestivalJudgesWithAssignments } from "@/features/judges/repositories/judge.repository";

function normalizeJudgeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function assertUniqueJudgeName(
  festivalId: string,
  candidateName: string,
  excludeJudgeId?: string,
) {
  const normalizedCandidate = normalizeJudgeName(candidateName);
  const existing = await db.query.judge.findMany({
    where: eq(judgeTable.festivalId, festivalId),
    columns: { id: true, name: true },
  });

  const conflict = existing.find((judge) => {
    if (excludeJudgeId && judge.id === excludeJudgeId) return false;
    return normalizeJudgeName(judge.name) === normalizedCandidate;
  });

  if (conflict) {
    throw new AppError(ERROR_MESSAGES.JUDGE_NAME_DUPLICATE);
  }
}

export async function getJudgesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return listFestivalJudgesWithAssignments(festivalId);
}

export async function createJudgeAction(
  festivalId: string,
  input: { name: string; description?: string | null },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const name = input.name.trim();
  if (!name) throw new AppError(ERROR_MESSAGES.JUDGE_NAME_REQUIRED);
  await assertUniqueJudgeName(festivalId, name);

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
  if (!name) throw new AppError(ERROR_MESSAGES.JUDGE_NAME_REQUIRED);
  await assertUniqueJudgeName(festivalId, name, judgeId);

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
  if (!updated) throw new AppError(ERROR_MESSAGES.JUDGE_NOT_FOUND);
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

