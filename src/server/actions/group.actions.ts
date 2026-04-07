"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { GroupService } from "@/server/services/group.service";

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

    // BASIC plan must not be able to modify team leader assignments.
    if (data.teamLeaderIds !== undefined) {
      const festival = await prisma.festival.findUnique({
        where: { id: festivalId },
        select: { tier: true },
      });

      const tier = getTierForFeatureCheck(festival?.tier);
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
