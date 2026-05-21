"use server";

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { judge as judgeTable } from "@/core/database/schema";
import { AppError, handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import {
  createJudgmentConfigurationAction,
  regenerateJudgmentConfigurationLinkAction,
} from "@/features/judgment/actions/judgment.actions";

type CreateJudgeLinkResponse = {
  judgeUrl: string;
  startedAt: Date;
  configId: string;
};

/**
 * Compatibility wrapper for results/judgment cards.
 * New flow should prefer judgment.actions.ts wizard APIs.
 */
export async function createProgrammeJudgeLinkAction(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<CreateJudgeLinkResponse>> {
  try {
    const judges = await db.query.judge.findMany({
      where: eq(judgeTable.festivalId, festivalId),
      columns: { id: true },
      limit: 50,
    });
    if (judges.length === 0) {
      throw new AppError(
        "Create at least one judge in Pre-Event Works before generating links.",
      );
    }
    const created = await createJudgmentConfigurationAction({
      festivalId,
      programmeId,
      scoreLimit: 10,
      judgeIds: judges.map((j) => j.id),
    });
    return {
      success: true,
      data: {
        configId: created.configId,
        judgeUrl: created.judgeUrl,
        startedAt: new Date(),
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function regenerateProgrammeJudgeLinkAction(
  festivalId: string,
  configId: string,
): Promise<ActionResponse<CreateJudgeLinkResponse>> {
  try {
    const regenerated = await regenerateJudgmentConfigurationLinkAction({
      festivalId,
      configId,
    });
    return {
      success: true,
      data: {
        configId,
        judgeUrl: regenerated.judgeUrl,
        startedAt: new Date(),
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}
