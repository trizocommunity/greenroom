/**
 * CategoryLimitService
 *
 * Manages per-category participation limits and computes warning status for
 * participants. Limits are soft (no hard blocks); violations are surfaced as
 * warnings in the UI.
 *
 * Limits are scoped by stageType (STAGE / NON_STAGE) plus a combined ALL cap.
 * NULL for any dimension = unlimited.
 *
 * PRO-tier only: callers must gate on isProTier() before exposing this to users.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  categoryProgrammeLimit,
  category as categoryTable,
  participant as participantTable,
} from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";
import {
  batchGetParticipantAssignmentCounts,
  batchGetParticipantProgrammeAssignments,
  type CategoryLimit,
  computeCountsFromAssignments,
  deleteCategoryLimit,
  findAllLimitsByFestival,
  findLimitByCategoryId,
  getParticipantAssignmentCounts,
  getParticipantIdsForCategoryProgrammes,
  type UpsertLimitInput,
  upsertCategoryLimit,
} from "@/features/category-limits/repositories/category-limit.repository";

export type { CategoryLimit, UpsertLimitInput };

/** The warning status for one participant against their category limits. */
export type ParticipantLimitStatus = {
  participantId: string;
  categoryId: string;
  categoryName?: string;
  stageCount: number;
  nonStageCount: number;
  allCount: number;
  maxStage: number | null;
  maxNonStage: number | null;
  maxAll: number | null;
  isOverStage: boolean;
  isOverNonStage: boolean;
  isOverAll: boolean;
  isOverLimit: boolean; // true if any dimension is exceeded
  generalStatus?: ParticipantLimitStatus | null;
};

/** Full category row with its optional limit config + violation counts. */
export type CategoryWithLimit = {
  id: string;
  name: string;
  type: string;
  limit: CategoryLimit | null;
  violationCounts: {
    stage: number;
    nonStage: number;
    all: number;
    total: number; // participants exceeding at least one dimension
  };
};

export const CategoryLimitService = {
  /** Fetch or upsert the limit for a category. */
  async upsert(
    categoryId: string,
    festivalId: string,
    input: UpsertLimitInput,
  ): Promise<CategoryLimit> {
    // Verify category belongs to festival
    const cat = await db.query.category.findFirst({
      where: eq(categoryTable.id, categoryId),
      columns: { id: true, festivalId: true },
    });
    if (!cat || cat.festivalId !== festivalId) {
      throw new AppError("Category not found", "CATEGORY_NOT_FOUND");
    }
    return upsertCategoryLimit(categoryId, festivalId, input);
  },

  /** Remove all limits for a category (all dimensions become unlimited). */
  async remove(categoryId: string, festivalId: string): Promise<void> {
    const cat = await db.query.category.findFirst({
      where: eq(categoryTable.id, categoryId),
      columns: { id: true, festivalId: true },
    });
    if (!cat || cat.festivalId !== festivalId) {
      throw new AppError("Category not found", "CATEGORY_NOT_FOUND");
    }
    await deleteCategoryLimit(categoryId);
  },

  /**
   * Compute the limit-warning status for a single participant.
   * If targetCategoryId is provided, checks against targetCategoryId limits.
   * Otherwise checks against participant's primary category limit, and attaches
   * generalStatus if festival has a GENERAL category with configured limits.
   */
  async computeParticipantLimitStatus(
    participantId: string,
    festivalId: string,
    targetCategoryId?: string,
  ): Promise<ParticipantLimitStatus | null> {
    const participant = await db.query.participant.findFirst({
      where: eq(participantTable.id, participantId),
      columns: { id: true, categoryId: true },
    });
    if (!participant) return null;

    const evalCategoryId = targetCategoryId ?? participant.categoryId;
    const limit = await findLimitByCategoryId(evalCategoryId);

    // Also check if festival has a GENERAL category with limits (for compound status)
    let generalStatus: ParticipantLimitStatus | null = null;
    if (!targetCategoryId) {
      const generalCategories = await db.query.category.findMany({
        where: and(
          eq(categoryTable.festivalId, festivalId),
          eq(categoryTable.type, "GENERAL"),
        ),
        columns: { id: true, name: true },
      });
      for (const gCat of generalCategories) {
        const gLimit = await findLimitByCategoryId(gCat.id);
        if (gLimit) {
          const gCounts = await getParticipantAssignmentCounts(
            participantId,
            festivalId,
            gCat.id,
          );
          generalStatus = buildLimitStatus(gCat.id, gLimit, gCounts, gCat.name);
          break;
        }
      }
    }

    if (!limit) {
      // If primary category has no limits, but general category does, return container with generalStatus
      if (generalStatus) {
        const primaryCounts = await getParticipantAssignmentCounts(
          participantId,
          festivalId,
          evalCategoryId,
        );
        return {
          participantId,
          categoryId: evalCategoryId,
          stageCount: primaryCounts.stageCount,
          nonStageCount: primaryCounts.nonStageCount,
          allCount: primaryCounts.allCount,
          maxStage: null,
          maxNonStage: null,
          maxAll: null,
          isOverStage: false,
          isOverNonStage: false,
          isOverAll: false,
          isOverLimit: generalStatus.isOverLimit,
          generalStatus,
        };
      }
      return null;
    }

    const counts = await getParticipantAssignmentCounts(
      participantId,
      festivalId,
      evalCategoryId,
    );

    const status = buildLimitStatus(evalCategoryId, limit, counts);
    if (generalStatus) {
      status.generalStatus = generalStatus;
      status.isOverLimit = status.isOverLimit || generalStatus.isOverLimit;
    }
    return status;
  },

  /**
   * Batch compute limit statuses for a list of participants.
   * Scopes primary category checks to programmes matching the participant's category,
   * and attaches any GENERAL category limit status.
   */
  async batchComputeLimitStatuses(
    participantIds: string[],
    festivalId: string,
  ): Promise<Map<string, ParticipantLimitStatus | null>> {
    if (participantIds.length === 0) return new Map();

    // Fetch participants with their categoryId
    const participants = await db.query.participant.findMany({
      where: (p, { inArray }) => inArray(p.id, participantIds),
      columns: { id: true, categoryId: true },
    });

    // Get all unique categoryIds and fetch their limits in one go
    const categoryIds = [...new Set(participants.map((p) => p.categoryId))];
    const limits = await Promise.all(
      categoryIds.map((cid) => findLimitByCategoryId(cid)),
    );
    const limitMap = new Map<string, CategoryLimit | null>();
    categoryIds.forEach((cid, i) => {
      limitMap.set(cid, limits[i]);
    });

    // Check if any GENERAL category in festival has limits
    const generalCategories = await db.query.category.findMany({
      where: and(
        eq(categoryTable.festivalId, festivalId),
        eq(categoryTable.type, "GENERAL"),
      ),
      columns: { id: true, name: true },
    });
    let generalCatLimit: {
      catId: string;
      catName: string;
      limit: CategoryLimit;
    } | null = null;
    for (const gCat of generalCategories) {
      const gLimit = await findLimitByCategoryId(gCat.id);
      if (gLimit) {
        generalCatLimit = {
          catId: gCat.id,
          catName: gCat.name,
          limit: gLimit,
        };
        break;
      }
    }

    // Batch fetch all assignments for these participants
    const assignmentsMap = await batchGetParticipantProgrammeAssignments(
      participantIds,
      festivalId,
    );

    const result = new Map<string, ParticipantLimitStatus | null>();
    for (const p of participants) {
      const limit = limitMap.get(p.categoryId) ?? null;
      const assignments = assignmentsMap.get(p.id) ?? [];

      let generalStatus: ParticipantLimitStatus | null = null;
      if (generalCatLimit) {
        const gCounts = computeCountsFromAssignments(
          p.id,
          assignments,
          generalCatLimit.catId,
        );
        generalStatus = buildLimitStatus(
          generalCatLimit.catId,
          generalCatLimit.limit,
          gCounts,
          generalCatLimit.catName,
        );
      }

      if (!limit) {
        if (generalStatus) {
          const primaryCounts = computeCountsFromAssignments(
            p.id,
            assignments,
            p.categoryId,
          );
          result.set(p.id, {
            participantId: p.id,
            categoryId: p.categoryId,
            stageCount: primaryCounts.stageCount,
            nonStageCount: primaryCounts.nonStageCount,
            allCount: primaryCounts.allCount,
            maxStage: null,
            maxNonStage: null,
            maxAll: null,
            isOverStage: false,
            isOverNonStage: false,
            isOverAll: false,
            isOverLimit: generalStatus.isOverLimit,
            generalStatus,
          });
        } else {
          result.set(p.id, null);
        }
        continue;
      }

      const counts = computeCountsFromAssignments(
        p.id,
        assignments,
        p.categoryId,
      );
      const status = buildLimitStatus(p.categoryId, limit, counts);
      if (generalStatus) {
        status.generalStatus = generalStatus;
        status.isOverLimit = status.isOverLimit || generalStatus.isOverLimit;
      }
      result.set(p.id, status);
    }

    // Participants not found in DB get null
    for (const id of participantIds) {
      if (!result.has(id)) result.set(id, null);
    }

    return result;
  },

  /**
   * Returns all categories for the festival with their configured limits
   * and live violation counts.
   * SINGLE categories count programmes belonging to that category for their participants.
   * GENERAL categories count General programmes across all participating members.
   */
  async getLimitsWithViolationsForFestival(
    festivalId: string,
  ): Promise<CategoryWithLimit[]> {
    // Fetch all categories
    const categories = await db.query.category.findMany({
      where: eq(categoryTable.festivalId, festivalId),
      columns: { id: true, name: true, type: true },
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    // Fetch all limits for this festival
    const allLimits = await findAllLimitsByFestival(festivalId);
    const limitMap = new Map(allLimits.map((l) => [l.categoryId, l]));

    // Fetch all participants in this festival
    const participants = await db.query.participant.findMany({
      where: eq(participantTable.festivalId, festivalId),
      columns: { id: true, categoryId: true },
    });

    // Group participants by primary category
    const participantsByCategory = new Map<string, string[]>();
    for (const p of participants) {
      const list = participantsByCategory.get(p.categoryId) ?? [];
      list.push(p.id);
      participantsByCategory.set(p.categoryId, list);
    }

    // For each category that has limits, batch-compute violations
    const result: CategoryWithLimit[] = [];
    for (const cat of categories) {
      const limit = limitMap.get(cat.id) ?? null;
      const violationCounts = { stage: 0, nonStage: 0, all: 0, total: 0 };

      if (limit) {
        let catParticipantIds: string[] = [];
        if (cat.type === "GENERAL") {
          catParticipantIds = await getParticipantIdsForCategoryProgrammes(
            cat.id,
            festivalId,
          );
        } else {
          catParticipantIds = participantsByCategory.get(cat.id) ?? [];
        }

        if (catParticipantIds.length > 0) {
          const assignmentMap = await batchGetParticipantProgrammeAssignments(
            catParticipantIds,
            festivalId,
          );
          const participantsOver = new Set<string>();
          for (const pid of catParticipantIds) {
            const assignments = assignmentMap.get(pid) ?? [];
            const counts = computeCountsFromAssignments(
              pid,
              assignments,
              cat.id,
            );
            const status = buildLimitStatus(cat.id, limit, counts, cat.name);
            if (status.isOverStage) violationCounts.stage++;
            if (status.isOverNonStage) violationCounts.nonStage++;
            if (status.isOverAll) violationCounts.all++;
            if (status.isOverLimit) participantsOver.add(pid);
          }
          violationCounts.total = participantsOver.size;
        }
      }

      result.push({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        limit,
        violationCounts,
      });
    }

    return result;
  },

  /**
   * Get participants in a category who exceed any limit,
   * with their specific violation details.
   */
  async getViolatorsForCategory(
    categoryId: string,
    festivalId: string,
  ): Promise<
    Array<{
      participant: {
        id: string;
        name: string;
        chestNumber: string | null;
        groupId: string | null;
        dateOfBirth: string | Date | null;
        group: { id: string; name: string; color: string | null } | null;
        categoryId: string;
        category: { id: string; name: string } | null;
      };
      status: ParticipantLimitStatus;
    }>
  > {
    const limit = await findLimitByCategoryId(categoryId);
    if (!limit) return [];

    const cat = await db.query.category.findFirst({
      where: and(
        eq(categoryTable.id, categoryId),
        eq(categoryTable.festivalId, festivalId),
      ),
      columns: { id: true, name: true, type: true },
    });
    if (!cat) return [];

    let participants: any[] = [];
    if (cat.type === "GENERAL") {
      const participantIds = await getParticipantIdsForCategoryProgrammes(
        categoryId,
        festivalId,
      );
      if (participantIds.length === 0) return [];

      participants = await db.query.participant.findMany({
        where: (p, { inArray }) => inArray(p.id, participantIds),
        columns: {
          id: true,
          name: true,
          chestNumber: true,
          groupId: true,
          categoryId: true,
          dateOfBirth: true,
        },
        with: {
          group: { columns: { id: true, name: true, color: true } },
          category: { columns: { id: true, name: true } },
        },
      });
    } else {
      participants = await db.query.participant.findMany({
        where: (p, { and, eq }) =>
          and(eq(p.categoryId, categoryId), eq(p.festivalId, festivalId)),
        columns: {
          id: true,
          name: true,
          chestNumber: true,
          groupId: true,
          categoryId: true,
          dateOfBirth: true,
        },
        with: {
          group: { columns: { id: true, name: true, color: true } },
          category: { columns: { id: true, name: true } },
        },
      });
    }

    if (participants.length === 0) return [];

    const assignmentMap = await batchGetParticipantProgrammeAssignments(
      participants.map((p) => p.id),
      festivalId,
    );

    const violators: Array<{
      participant: {
        id: string;
        name: string;
        chestNumber: string | null;
        groupId: string | null;
        dateOfBirth: string | Date | null;
        group: { id: string; name: string; color: string | null } | null;
        categoryId: string;
        category: { id: string; name: string } | null;
      };
      status: ParticipantLimitStatus;
    }> = [];

    for (const p of participants) {
      const assignments = assignmentMap.get(p.id) ?? [];
      const counts = computeCountsFromAssignments(
        p.id,
        assignments,
        categoryId,
      );
      const status = buildLimitStatus(categoryId, limit, counts, cat.name);
      if (status.isOverLimit) {
        violators.push({ participant: p, status });
      }
    }

    return violators;
  },

  /**
   * Get all participants in a festival who exceed any category limit,
   * with their specific violation details.
   */
  async getAllViolatorsForFestival(festivalId: string): Promise<
    Array<{
      category: { id: string; name: string };
      participant: {
        id: string;
        name: string;
        chestNumber: string | null;
        groupId: string | null;
        dateOfBirth: string | Date | null;
        group: { id: string; name: string; color: string | null } | null;
        categoryId: string;
        category: { id: string; name: string } | null;
      };
      status: ParticipantLimitStatus;
    }>
  > {
    const categoriesWithLimits =
      await this.getLimitsWithViolationsForFestival(festivalId);
    const violatingCategories = categoriesWithLimits.filter(
      (c) => c.violationCounts.total > 0 && c.limit,
    );

    if (violatingCategories.length === 0) return [];

    const allViolators: Array<{
      category: { id: string; name: string };
      participant: {
        id: string;
        name: string;
        chestNumber: string | null;
        groupId: string | null;
        dateOfBirth: string | Date | null;
        group: { id: string; name: string; color: string | null } | null;
        categoryId: string;
        category: { id: string; name: string } | null;
      };
      status: ParticipantLimitStatus;
    }> = [];

    for (const cat of violatingCategories) {
      const catViolators = await this.getViolatorsForCategory(
        cat.id,
        festivalId,
      );
      allViolators.push(
        ...catViolators.map((v) => ({
          category: { id: cat.id, name: cat.name },
          participant: v.participant,
          status: v.status,
        })),
      );
    }

    return allViolators;
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildLimitStatus(
  categoryId: string,
  limit: CategoryLimit,
  counts: {
    participantId: string;
    stageCount: number;
    nonStageCount: number;
    allCount: number;
  },
  categoryName?: string,
): ParticipantLimitStatus {
  const isOverStage =
    limit.maxStage !== null && counts.stageCount > limit.maxStage;
  const isOverNonStage =
    limit.maxNonStage !== null && counts.nonStageCount > limit.maxNonStage;
  const isOverAll = limit.maxAll !== null && counts.allCount > limit.maxAll;

  return {
    participantId: counts.participantId,
    categoryId,
    categoryName,
    stageCount: counts.stageCount,
    nonStageCount: counts.nonStageCount,
    allCount: counts.allCount,
    maxStage: limit.maxStage,
    maxNonStage: limit.maxNonStage,
    maxAll: limit.maxAll,
    isOverStage,
    isOverNonStage,
    isOverAll,
    isOverLimit: isOverStage || isOverNonStage || isOverAll,
  };
}

