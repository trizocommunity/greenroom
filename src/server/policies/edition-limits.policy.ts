import { UsageCounterService } from "../services/usage-counter.service";
import { EditionPolicy } from "./edition.policy";
import { findEditionById } from "@/server/models/edition.model";

/**
 * Edition Limits Policy
 * The Guard that controllers must call before adding resources.
 */
export const EditionLimitsPolicy = {
  /**
   * Asserts validity strategies + Increments counter.
   *
   * @param editionId Target edition
   * @throws Error if limits exceeded or edition not writable
   */
  async assertCanAddParticipant(editionId: string) {
    // 1. Lifecycle Check
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");

    await EditionPolicy.assertEditionWritable(edition);

    // 2. Limit Check & Increment
    await UsageCounterService.incrementUsage(editionId, "participants", 1);
  },

  async assertCanAddEvent(editionId: string) {
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");

    await EditionPolicy.assertEditionWritable(edition);
    await UsageCounterService.incrementUsage(editionId, "events", 1);
  },

  async assertCanAddJudge(editionId: string) {
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");

    await EditionPolicy.assertEditionWritable(edition);
    await UsageCounterService.incrementUsage(editionId, "judges", 1);
  },

  async assertCanUploadFile(editionId: string, sizeMB: number) {
    const edition = await findEditionById(editionId);
    if (!edition) throw new Error("Edition not found");

    await EditionPolicy.assertEditionWritable(edition);
    await UsageCounterService.incrementUsage(editionId, "storage", sizeMB);
  },
};
