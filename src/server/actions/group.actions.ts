"use server";

import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
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
  await assertFestivalAccess(session, festivalId);
  return GroupService.create(festivalId, {
    name: data.name,
    seriesStart: data.seriesStart,
    color: data.color,
  });
}

export async function deleteGroupAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
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
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return GroupService.update(id, festivalId, {
    name: data.name,
    seriesStart: data.seriesStart,
    color: data.color,
    teamLeaderIds: data.teamLeaderIds,
  });
}
