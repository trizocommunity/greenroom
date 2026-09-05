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

export type ParticipantProgrammeItem = {
  programmeId: string;
  stageType: string;
  categoryId: string;
};

/**
 * Compute counts from a list of assignments, optionally filtered to a specific category.
 */
export function computeCountsFromAssignments(
  participantId: string,
  assignments: ParticipantProgrammeItem[],
  targetCategoryId?: string,
): ParticipantLimitCounts {
  const filtered = targetCategoryId
    ? assignments.filter((a) => a.categoryId === targetCategoryId)
    : assignments;

  const stageCount = filtered.filter((a) => a.stageType === "STAGE").length;
  const nonStageCount = filtered.filter(
    (a) => a.stageType === "NON_STAGE",
  ).length;

  return {
    participantId,
    stageCount,
    nonStageCount,
    allCount: filtered.length,
  };
}

/**
 * Count how many programmes a participant is currently assigned to,
 * broken down by stageType. Excludes CANCELLED programmes.
 * If targetCategoryId is provided, counts only programmes belonging to that category.
 * Counts both INDIVIDUAL direct assignments and GROUP member assignments.
 */
export async function getParticipantAssignmentCounts(
  participantId: string,
  festivalId: string,
  targetCategoryId?: string,
): Promise<ParticipantLimitCounts> {
  // INDIVIDUAL assignments where participant is directly assigned
  const individualRows = await db
    .select({
      programmeId: programmeAssignment.programmeId,
      stageType: programmeTable.stageType,
      categoryId: programmeTable.categoryId,
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
      programmeId: programmeAssignment.programmeId,
      stageType: programmeTable.stageType,
      categoryId: programmeTable.categoryId,
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

  // Deduplicate by programmeId
  const uniqueProgrammes = new Map<string, (typeof allRows)[0]>();
  for (const row of allRows) {
    if (!uniqueProgrammes.has(row.programmeId)) {
      uniqueProgrammes.set(row.programmeId, row);
    }
  }

  const uniqueRows = Array.from(uniqueProgrammes.values());
  return computeCountsFromAssignments(
    participantId,
    uniqueRows,
    targetCategoryId,
  );
}

/**
 * Batch: get all programme assignments for multiple participants in one query set.
 * Returns a Map of participantId -> ParticipantProgrammeItem[] (deduplicated by programmeId).
 */
export async function batchGetParticipantProgrammeAssignments(
  participantIds: string[],
  festivalId: string,
): Promise<Map<string, ParticipantProgrammeItem[]>> {
  if (participantIds.length === 0) return new Map();

  // INDIVIDUAL
  const individualRows = await db
    .select({
      participantId: programmeAssignment.participantId,
      programmeId: programmeAssignment.programmeId,
      stageType: programmeTable.stageType,
      categoryId: programmeTable.categoryId,
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
      programmeId: programmeAssignment.programmeId,
      stageType: programmeTable.stageType,
      categoryId: programmeTable.categoryId,
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

  const result = new Map<string, ParticipantProgrammeItem[]>();
  const seenProgrammes = new Map<string, Set<string>>();

  for (const id of participantIds) {
    result.set(id, []);
    seenProgrammes.set(id, new Set<string>());
  }

  const processRow = (row: {
    participantId: string | null;
    programmeId: string;
    stageType: string;
    categoryId: string;
  }) => {
    if (!row.participantId) return;
    const list = result.get(row.participantId);
    const seen = seenProgrammes.get(row.participantId);
    if (!list || !seen) return;

    if (seen.has(row.programmeId)) return;
    seen.add(row.programmeId);

    list.push({
      programmeId: row.programmeId,
      stageType: row.stageType,
      categoryId: row.categoryId,
    });
  };

  for (const row of individualRows) {
    processRow(row);
  }

  for (const row of memberRows) {
    processRow(row);
  }

  return result;
}

/**
 * Get all participant IDs who are assigned to programmes in a specific category.
 * Used to discover participants with assignments in GENERAL (or specific) categories.
 */
export async function getParticipantIdsForCategoryProgrammes(
  categoryId: string,
  festivalId: string,
): Promise<string[]> {
  const individualRows = await db
    .select({
      participantId: programmeAssignment.participantId,
    })
    .from(programmeAssignment)
    .innerJoin(
      programmeTable,
      eq(programmeTable.id, programmeAssignment.programmeId),
    )
    .where(
      and(
        eq(programmeTable.categoryId, categoryId),
        eq(programmeAssignment.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
        sql`${programmeAssignment.participantId} IS NOT NULL`,
      ),
    );

  const memberRows = await db
    .select({
      participantId: programmeAssignmentMember.participantId,
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
        eq(programmeTable.categoryId, categoryId),
        eq(programmeAssignmentMember.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
      ),
    );

  const idSet = new Set<string>();
  for (const r of individualRows) {
    if (r.participantId) idSet.add(r.participantId);
  }
  for (const r of memberRows) {
    if (r.participantId) idSet.add(r.participantId);
  }

  return Array.from(idSet);
}

/**
 * Batch: get counts for multiple participants in one query set,
 * optionally filtered to a specific category (or per-participant category map).
 */
export async function batchGetParticipantAssignmentCounts(
  participantIds: string[],
  festivalId: string,
  targetCategory?: string | Map<string, string>,
): Promise<Map<string, ParticipantLimitCounts>> {
  if (participantIds.length === 0) return new Map();

  const assignmentsMap = await batchGetParticipantProgrammeAssignments(
    participantIds,
    festivalId,
  );

  const result = new Map<string, ParticipantLimitCounts>();
  for (const id of participantIds) {
    const list = assignmentsMap.get(id) ?? [];
    const catId =
      typeof targetCategory === "string"
        ? targetCategory
        : targetCategory?.get(id);

    result.set(id, computeCountsFromAssignments(id, list, catId));
  }

  return result;
}
