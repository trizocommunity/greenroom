"use server";

import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable, stage, user } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";

export type StageData = {
  name: string;
  description?: string;
};

export async function createStage(festivalId: string, data: StageData) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const userRecord = session?.userId
    ? await db.query.user.findFirst({
        where: eq(user.id, session.userId),
        columns: { fullName: true, displayName: true, email: true },
      })
    : null;

  const createdBy =
    userRecord?.displayName ||
    userRecord?.fullName ||
    userRecord?.email ||
    "Unknown";

  await UsageCounterService.incrementUsage(festivalId, "stages", 1);

  await db.insert(stage).values({
    id: randomUUID(),
    updatedAt: new Date().toISOString(),
    festivalId,
    name: data.name,
    description: data.description,
    createdBy,
  });

  const festivalRecord = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (festivalRecord) {
    revalidatePath(
      `/dashboard/${festivalRecord.slug}/event-works/stage-management`,
    );
  }
}

export async function updateStage(stageId: string, data: StageData) {
  const session = await getSession();
  const stageRecord = await db.query.stage.findFirst({
    where: eq(stage.id, stageId),
    columns: { festivalId: true },
  });
  if (!stageRecord) throw new AppError(ERROR_MESSAGES.NOT_FOUND);
  await assertFestivalAccess(session, stageRecord.festivalId, {
    requireWritable: true,
  });

  await db
    .update(stage)
    .set({ name: data.name, description: data.description })
    .where(eq(stage.id, stageId));

  const festivalRecord = await db.query.festival.findFirst({
    where: eq(festivalTable.id, stageRecord.festivalId),
    columns: { slug: true },
  });

  if (festivalRecord) {
    revalidatePath(
      `/dashboard/${festivalRecord.slug}/event-works/stage-management`,
    );
  }
}

export async function deleteStage(stageId: string) {
  const session = await getSession();
  const stageRecord = await db.query.stage.findFirst({
    where: eq(stage.id, stageId),
    with: { festival: true },
  });

  if (!stageRecord) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  await assertFestivalAccess(session, stageRecord.festivalId, {
    requireWritable: true,
  });

  await db.delete(stage).where(eq(stage.id, stageId));
  await UsageCounterService.incrementUsage(
    stageRecord.festivalId,
    "stages",
    -1,
  );

  revalidatePath(
    `/dashboard/${stageRecord.festival.slug}/event-works/stage-management`,
  );
}

export async function getStages(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return db.query.stage.findMany({
    where: eq(stage.festivalId, festivalId),
    orderBy: [desc(stage.createdAt)],
  });
}
