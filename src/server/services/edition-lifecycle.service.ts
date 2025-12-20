import { type Edition, EditionStatus } from "@prisma/client";
import { updateEdition } from "@/server/models/edition.model";

/**
 * STRICT Edition Lifecycle Logic
 * Source of Truth for all state transitions.
 *
 * Rules:
 * 1. ACTIVE -> FREEZE: if now > endsAt
 * 2. FREEZE -> ARCHIVED: if now > endsAt + 1 year
 */
export const EditionLifecycleService = {
  /**
   * Evaluates and updates the edition status based on time.
   * This is a LAZY update mechanism.
   *
   * @param edition The edition to check
   * @returns PROMISE of the edition (potentially updated)
   */
  async evaluate(edition: Edition): Promise<Edition> {
    const now = new Date();
    const endsAt = new Date(edition.endsAt);
    const oneYearAfterEnd = new Date(endsAt);
    oneYearAfterEnd.setFullYear(oneYearAfterEnd.getFullYear() + 1);

    let newStatus: EditionStatus | null = null;

    // Rule 2: FREEZE -> ARCHIVED
    // Check this first because it's the final state
    if (now > oneYearAfterEnd) {
      if (edition.status !== "ARCHIVED") {
        newStatus = "ARCHIVED";
      }
    }
    // Rule 1: ACTIVE -> FREEZE
    else if (now > endsAt) {
      if (edition.status === "ACTIVE") {
        newStatus = "FREEZE";
      }
    }

    // Apply transition if needed
    if (newStatus) {
      console.log(
        `[Lifecycle] Transitioning Edition ${edition.id} from ${edition.status} to ${newStatus}`,
      );
      return await updateEdition(edition.id, { status: newStatus });
    }

    return edition;
  },
};
