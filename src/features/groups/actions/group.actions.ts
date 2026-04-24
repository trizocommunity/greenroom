"use server";

import { eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { ERROR_MESSAGES, handleActionError } from "@/core/errors/errors";
import { GroupService } from "@/features/groups/services/group.service";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";

export async function getGroupsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return GroupService.getAll(festivalId);
}

export async function createGroupAction(
  festivalId: string,
  data: { name: string; seriesStart?: number; color?: string },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  return GroupService.create(festivalId, {
    name: data.name,
    seriesStart: data.seriesStart,
    color: data.color,
  });
}

export async function deleteGroupAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  return GroupService.delete(id, festivalId);
}

export async function updateGroupAction(
  festivalId: string,
  id: string,
  data: {
    name: string;
    seriesStart?: number;
    color?: string;
    teamLeaderIds?: string[];
  },
) {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });

    if (data.teamLeaderIds !== undefined) {
      const festival = await db.query.festival.findFirst({
        where: eq(festivalTable.id, festivalId),
        columns: { tier: true },
      });

      const tier = getTierForFeatureCheck(festival?.tier as any);
      if (!FeatureService.isFeatureEnabled(tier, "members")) {
        return { success: false, error: ERROR_MESSAGES.FORBIDDEN };
      }
    }

    return GroupService.update(id, festivalId, {
      name: data.name,
      seriesStart: data.seriesStart,
      color: data.color,
      teamLeaderIds: data.teamLeaderIds,
    });
  } catch (error) {
    return handleActionError(error);
  }
}
