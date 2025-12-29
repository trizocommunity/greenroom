"use server";

import { GroupService } from "@/server/services/group.service";

export async function getGroupsAction(festivalId: string) {
  return GroupService.getAll(festivalId);
}

export async function createGroupAction(
  festivalId: string,
  data: { name: string; seriesStart?: number; color?: string },
) {
  return GroupService.create(festivalId, {
    name: data.name,
    seriesStart: data.seriesStart,
    color: data.color,
  });
}

export async function deleteGroupAction(festivalId: string, id: string) {
  return GroupService.delete(id, festivalId);
}

export async function updateGroupAction(
  festivalId: string,
  id: string,
  data: { name: string; seriesStart?: number; color?: string },
) {
  return GroupService.update(id, festivalId, {
    name: data.name,
    seriesStart: data.seriesStart,
    color: data.color,
  });
}
