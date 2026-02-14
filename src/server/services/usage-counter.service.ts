import type { Prisma } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";

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
   * @param resource The resource type ("students" | "events" | "judges" | "storage")
   * @param amount Amount to increment (default 1)
   * @param transaction Optional existing transaction
   */
  async incrementUsage(
    festivalId: string,
    resource: "students" | "programmes" | "events" | "stages" | "storage",
    amount = 1,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || prisma;

    // 1. Fetch current usage & limit relative to the resource
    const festival = await db.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new Error("Festival not found.");
    }

    const limits = TIER_CONFIG[festival.tier].limits;

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
      case "events":
        currentUsage = festival.eventsCount;
        maxLimit = limits.events || 999; // No limit enforced for public events by default
        fieldToUpdate = "eventsCount";
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

    // 3. Strict Check
    if (currentUsage + amount > maxLimit) {
      throw new Error(
        `[Limit Exceeded] Cannot add ${amount} to ${resource}. Usage: ${currentUsage}/${maxLimit}`,
      );
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
