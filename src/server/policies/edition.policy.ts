import type { Edition } from "@prisma/client";
import { EditionLifecycleService } from "../services/edition-lifecycle.service";

/**
 * Edition Write Guard
 * MUST be called before any write operation on an edition.
 */
export const EditionPolicy = {
  /**
   * Asserts that an edition is writable (ACTIVE).
   * Performs a Lazy Lifecycle Evaluation first.
   *
   * @param edition The edition to check
   * @throws Error if edition is not ACTIVE
   * @returns Promise<void>
   */
  async assertEditionWritable(edition: Edition): Promise<void> {
    // 1. Lazy Evaluate (Ensure status is up to date with time)
    const currentEdition = await EditionLifecycleService.evaluate(edition);

    // 2. Strict Check
    if (currentEdition.status !== "ACTIVE") {
      throw new Error(
        `[EditionPolicy] Write BLOCKED. Edition ${currentEdition.id} is ${currentEdition.status} (Must be ACTIVE).`,
      );
    }
  },
};
