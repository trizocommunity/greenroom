import { eq, sql } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { festival as festivals } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { getResolvedTier } from "@/features/plan-features/services/tier";

/**
 * Usage Counter Service
 * Handles atomic increments for festival resources.
 *
 * Strategy: Check-and-Increment transaction.
 */
export const UsageCounterService = {
  /**
   * Atomically increments a usage counter if it doesn't exceed the limit.
   *
   * @param festivalId The festival to update
   * @param resource The resource type ("students" | "programmes" | "stages" | "storage")
   * @param amount Amount to increment (default 1)
   */
  async incrementUsage(
    festivalId: string,
    resource: "students" | "programmes" | "stages" | "storage",
    amount = 1,
  ) {
    // 1. Fetch current usage & limit relative to the resource
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });

    if (!festival) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const limits = TIER_CONFIG[getResolvedTier(festival.tier)].limits;

    // 2. Map resource to fields
    let currentUsage = 0;
    let maxLimit = 0;
    let fieldToUpdate: keyof typeof festivals.$inferInsert = "studentsCount";

    switch (resource) {
      case "students":
        currentUsage = festival.studentsCount;
        maxLimit = limits.students;
        fieldToUpdate = "studentsCount";
        break;
      case "programmes":
        currentUsage = festival.programmesCount;
        maxLimit = limits.programmes;
        fieldToUpdate = "programmesCount";
        break;
      case "stages":
        currentUsage = festival.stagesCount;
        maxLimit = limits.stages;
        fieldToUpdate = "stagesCount";
        break;
      case "storage":
        currentUsage = festival.storageUsedMb;
        maxLimit = limits.storageMB;
        fieldToUpdate = "storageUsedMb";
        break;
    }

    // 3. Strict Checks
    if (currentUsage + amount > maxLimit) {
      throw new AppError(ERROR_MESSAGES.USAGE_LIMIT_EXCEEDED);
    }
    if (currentUsage + amount < 0) {
      amount = -currentUsage;
    }

    // 4. Atomic Increment using SQL
    await db
      .update(festivals)
      .set({
        [fieldToUpdate]: sql`${festivals[fieldToUpdate as keyof typeof festivals.$inferSelect]} + ${amount}`,
      })
      .where(eq(festivals.id, festivalId));
  },
};
