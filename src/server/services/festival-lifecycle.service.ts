import { prisma } from "@/lib/db";

/**
 * Service to handle Festival Lifecycle management (Auto-Expiry).
 * Phase 6: Festival self-destructs after 40 days.
 */
export const FestivalLifecycleService = {
  /**
   * Deletes festivals that have passed their 40-day lifetime.
   * This is a hard delete of the festival and all its data (students, programmes, etc.)
   * except Payments (which are preserved but unlinked via SetNull).
   *
   * @returns Number of festivals deleted
   */
  async cleanupExpiredFestivals() {
    const now = new Date();

    try {
      // Hard delete festivals expiring before NOW.
      // Relies on database CASCADE for internal data (Students, Programmes)
      // Relies on SetNull for Payments.
      const result = await prisma.festival.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
          // Only delete if expiresAt is set (Safety against unmigrated data)
          NOT: {
            expiresAt: null,
          },
        },
      });

      if (result.count > 0) {
        console.log(`[Lifecycle] Deleted ${result.count} expired festivals.`);
      }

      return result.count;
    } catch (error) {
      console.error("[Lifecycle] Failed to cleanup festivals:", error);
      throw error;
    }
  },
};
