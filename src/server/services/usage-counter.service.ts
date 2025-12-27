import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TIER_CONFIG } from "@/config/pricing";

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
   * @param resource The resource type ("participants" | "events" | "judges" | "storage")
   * @param amount Amount to increment (default 1)
   * @param transaction Optional existing transaction
   */
  async incrementUsage(
    festivalId: string,
    resource: "participants" | "events" | "judges" | "storage",
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
      case "participants":
        currentUsage = festival.participantsCount;
        maxLimit = limits.participants;
        fieldToUpdate = "participantsCount";
        break;
      case "events":
        currentUsage = festival.eventsCount;
        maxLimit = limits.events;
        fieldToUpdate = "eventsCount";
        break;
      case "judges":
        currentUsage = festival.judgesCount;
        maxLimit = limits.judges;
        fieldToUpdate = "judgesCount";
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
