"use server";

import { randomUUID } from "crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable, stage, user } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

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
    updatedAt: serverNowIso(),
    festivalId,
    name: data.name,
    description: data.description,
    createdByName: createdBy,
    createdByEmail: userRecord?.email || null,
  });

  const festivalRecord = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (festivalRecord) {
    revalidatePath(
      `/dashboard/${festivalRecord.slug}/pre-event-works/stage-management`,
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
      `/dashboard/${festivalRecord.slug}/pre-event-works/stage-management`,
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

  if (stageRecord.isOffStage) {
    throw new AppError(
      "The Off-Stage stage cannot be deleted. It is required for judging programmes without a scheduled time slot.",
    );
  }

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
    `/dashboard/${stageRecord.festival.slug}/pre-event-works/stage-management`,
  );
}

export async function getStages(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    session,
  );

  return db.query.stage.findMany({
    where:
      accessibleStageIds === "all"
        ? eq(stage.festivalId, festivalId)
        : accessibleStageIds.length > 0
          ? inArray(stage.id, accessibleStageIds)
          : inArray(stage.id, ["__none__"]),
    orderBy: [desc(stage.createdAt)],
  });
}
