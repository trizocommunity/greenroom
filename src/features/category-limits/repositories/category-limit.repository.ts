import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  categoryProgrammeLimit,
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmeTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

export type CategoryLimit = typeof categoryProgrammeLimit.$inferSelect;

export type UpsertLimitInput = {
  maxStage: number | null;
  maxNonStage: number | null;
  maxAll: number | null;
};

/** Find the limit row for one category, or null if no limits are set. */
export async function findLimitByCategoryId(
  categoryId: string,
): Promise<CategoryLimit | null> {
  const row = await db.query.categoryProgrammeLimit.findFirst({
    where: eq(categoryProgrammeLimit.categoryId, categoryId),
  });
  return row ?? null;
}

/** Return all limit rows for a festival (one per category that has limits). */
export async function findAllLimitsByFestival(
  festivalId: string,
): Promise<CategoryLimit[]> {
  return db.query.categoryProgrammeLimit.findMany({
    where: eq(categoryProgrammeLimit.festivalId, festivalId),
  });
}

/**
 * Create or update the limit for a given category.
 * Passing null for a dimension means "no limit / remove the cap".
 */
export async function upsertCategoryLimit(
  categoryId: string,
  festivalId: string,
  input: UpsertLimitInput,
): Promise<CategoryLimit> {
  const { randomUUID } = await import("crypto");
  const now = serverNowIso();

  const existing = await findLimitByCategoryId(categoryId);

  if (existing) {
    const [updated] = await db
      .update(categoryProgrammeLimit)
      .set({
        maxStage: input.maxStage,
        maxNonStage: input.maxNonStage,
        maxAll: input.maxAll,
        updatedAt: now,
      })
      .where(eq(categoryProgrammeLimit.categoryId, categoryId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(categoryProgrammeLimit)
    .values({
      id: randomUUID(),
      festivalId,
      categoryId,
      maxStage: input.maxStage,
      maxNonStage: input.maxNonStage,
      maxAll: input.maxAll,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}

/** Delete the limit row for a category (all limits removed = unlimited). */
export async function deleteCategoryLimit(categoryId: string): Promise<void> {
  await db
    .delete(categoryProgrammeLimit)
    .where(eq(categoryProgrammeLimit.categoryId, categoryId));
}

// ─── Per-participant assignment counts ───────────────────────────────────────

export type ParticipantLimitCounts = {
  participantId: string;
  stageCount: number;
  nonStageCount: number;
  allCount: number;
};

/**
 * Count how many programmes a participant is currently assigned to,
 * broken down by stageType. Excludes CANCELLED programmes.
 * Counts both INDIVIDUAL direct assignments and GROUP member assignments.
 */
export async function getParticipantAssignmentCounts(
  participantId: string,
  festivalId: string,
): Promise<ParticipantLimitCounts> {
  // INDIVIDUAL assignments where participant is directly assigned
  const individualRows = await db
    .select({
      stageType: programmeTable.stageType,
    })
    .from(programmeAssignment)
    .innerJoin(
      programmeTable,
      eq(programmeTable.id, programmeAssignment.programmeId),
    )
    .where(
      and(
        eq(programmeAssignment.participantId, participantId),
        eq(programmeAssignment.festivalId, festivalId),
        // Exclude cancelled programmes
        sql`${programmeTable.status} != 'CANCELLED'`,
      ),
    );

  // GROUP assignments where participant is a member
  const memberRows = await db
    .select({
      stageType: programmeTable.stageType,
    })
    .from(programmeAssignmentMember)
    .innerJoin(
      programmeAssignment,
      eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
    )
    .innerJoin(
      programmeTable,
      eq(programmeTable.id, programmeAssignment.programmeId),
    )
    .where(
      and(
        eq(programmeAssignmentMember.participantId, participantId),
        eq(programmeAssignmentMember.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
      ),
    );

  const allRows = [...individualRows, ...memberRows];
  const stageCount = allRows.filter((r) => r.stageType === "STAGE").length;
  const nonStageCount = allRows.filter(
    (r) => r.stageType === "NON_STAGE",
  ).length;

  return {
    participantId,
    stageCount,
    nonStageCount,
    allCount: allRows.length,
  };
}

/**
 * Batch: get counts for multiple participants in one query set.
 */
export async function batchGetParticipantAssignmentCounts(
  participantIds: string[],
  festivalId: string,
): Promise<Map<string, ParticipantLimitCounts>> {
  if (participantIds.length === 0) return new Map();

  // INDIVIDUAL
  const individualRows = await db
    .select({
      participantId: programmeAssignment.participantId,
      stageType: programmeTable.stageType,
    })
    .from(programmeAssignment)
    .innerJoin(
      programmeTable,
      eq(programmeTable.id, programmeAssignment.programmeId),
    )
    .where(
      and(
        inArray(programmeAssignment.participantId, participantIds),
        eq(programmeAssignment.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
        sql`${programmeAssignment.participantId} IS NOT NULL`,
      ),
    );

  // GROUP members
  const memberRows = await db
    .select({
      participantId: programmeAssignmentMember.participantId,
      stageType: programmeTable.stageType,
    })
    .from(programmeAssignmentMember)
    .innerJoin(
      programmeAssignment,
      eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
    )
    .innerJoin(
      programmeTable,
      eq(programmeTable.id, programmeAssignment.programmeId),
    )
    .where(
      and(
        inArray(programmeAssignmentMember.participantId, participantIds),
        eq(programmeAssignmentMember.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
      ),
    );

  const result = new Map<string, ParticipantLimitCounts>();

  for (const id of participantIds) {
    result.set(id, {
      participantId: id,
      stageCount: 0,
      nonStageCount: 0,
      allCount: 0,
    });
  }

  for (const row of individualRows) {
    if (!row.participantId) continue;
    const entry = result.get(row.participantId);
    if (!entry) continue;
    entry.allCount++;
    if (row.stageType === "STAGE") entry.stageCount++;
    else if (row.stageType === "NON_STAGE") entry.nonStageCount++;
  }

  for (const row of memberRows) {
    const entry = result.get(row.participantId);
    if (!entry) continue;
    entry.allCount++;
    if (row.stageType === "STAGE") entry.stageCount++;
    else if (row.stageType === "NON_STAGE") entry.nonStageCount++;
  }

  return result;
}
