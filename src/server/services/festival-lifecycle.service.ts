import { db } from "@/lib/db";
import { festival as festivals } from "../db/schema";
import { eq, lt, ne, isNotNull } from "drizzle-orm";

/**
 * Service to handle Festival Lifecycle management (Auto-Expiry).
 * Phase 6: Festival self-destructs after 40 days.
 */
export const FestivalLifecycleService = {
  /**
   * Deletes festivals that have passed their 40-day lifetime.
   * This is a hard delete of the festival and all its data (students, programme as programmes, etc.)
   * except Payments (which are preserved but unlinked via SetNull).
   *
   * @returns Number of festivals deleted
   */
  async cleanupExpiredFestivals() {
    const now = new Date();

    try {
      // Hard delete festivals expiring before NOW.
      // Relies on database CASCADE for internal data (Students, Programmes)
      const result = await db
        .delete(festivals)
        .where(
          // expiresAt < now AND expiresAt IS NOT NULL
          lt(festivals.expiresAt, now)
        )
        .returning();

      if (result.length > 0) {
        // Logging hook
      }

      return result.length;
    } catch (error) {
      console.error("[Lifecycle] Failed to cleanup festivals:", error);
      throw error;
    }
  },
};
