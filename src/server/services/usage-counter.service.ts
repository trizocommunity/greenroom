import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Usage Counter Service
 * Handles atomic increments for edition resources.
 *
 * Strategy: Check-and-Increment transaction.
 */
export const UsageCounterService = {
  /**
   * Atomically increments a usage counter if it doesn't exceed the limit.
   *
   * @param editionId The edition to update
   * @param resource The resource type ("participants" | "events" | "judges" | "storage")
   * @param amount Amount to increment (default 1)
   * @param transaction Optional existing transaction
   */
  async incrementUsage(
    editionId: string,
    resource: "participants" | "events" | "judges" | "storage",
    amount = 1,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || prisma;

    // 1. Fetch current usage & limit relative to the resource
    // We fetch the edition AND its limits
    const edition = await db.edition.findUnique({
      where: { id: editionId },
      include: { limits: true },
    });

    if (!edition || !edition.limits) {
      throw new Error("Edition or limits not found.");
    }

    // 2. Map resource to fields
    let currentUsage = 0;
    let maxLimit = 0;
    let fieldToUpdate = "";

    switch (resource) {
      case "participants":
        currentUsage = edition.participantsCount;
        maxLimit = edition.limits.maxParticipants;
        fieldToUpdate = "participantsCount";
        break;
      case "events":
        currentUsage = edition.eventsCount;
        maxLimit = edition.limits.maxEvents;
        fieldToUpdate = "eventsCount";
        break;
      case "judges":
        currentUsage = edition.judgesCount;
        maxLimit = edition.limits.maxJudges;
        fieldToUpdate = "judgesCount";
        break;
      case "storage":
        currentUsage = edition.storageUsedMB;
        maxLimit = edition.limits.maxStorageMB;
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
    await db.edition.update({
      where: { id: editionId },
      data: {
        [fieldToUpdate]: { increment: amount },
      },
    });

    console.log(
      `[UsageCounter] Incremented ${resource} for edition ${editionId}. New usage: ${currentUsage + amount}`,
    );
  },
};
