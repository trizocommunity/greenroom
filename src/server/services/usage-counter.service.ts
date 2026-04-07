import type { Prisma } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { getResolvedTier } from "@/lib/tier";

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
   * @param transaction Optional existing transaction
   */
  async incrementUsage(
    festivalId: string,
    resource: "students" | "programmes" | "stages" | "storage",
    amount = 1,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || prisma;

    // 1. Fetch current usage & limit relative to the resource
    const festival = await db.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const limits = TIER_CONFIG[getResolvedTier(festival.tier)].limits;

    // 2. Map resource to fields
    let currentUsage = 0;
    let maxLimit = 0;
    let fieldToUpdate = "";

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
        currentUsage = festival.storageUsedMB;
        maxLimit = limits.storageMB;
        fieldToUpdate = "storageUsedMB";
        break;
    }

    // 3. Strict Checks
    if (currentUsage + amount > maxLimit) {
      throw new AppError(ERROR_MESSAGES.USAGE_LIMIT_EXCEEDED);
    }
    if (currentUsage + amount < 0) {
      amount = -currentUsage;
    }

    // 4. Atomic Increment
    await db.festival.update({
      where: { id: festivalId },
      data: {
        [fieldToUpdate]: { increment: amount },
      },
    });
  },
};
