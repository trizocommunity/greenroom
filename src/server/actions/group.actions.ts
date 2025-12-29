"use server";

import { GroupService } from "@/server/services/group.service";

export async function getGroupsAction(festivalId: string) {
  return GroupService.getAll(festivalId);
}

export async function createGroupAction(
  festivalId: string,
  data: { name: string; type?: string; seriesStart?: number },
) {
  return GroupService.create(festivalId, {
    name: data.name,
    type: (data.type as "SCHOOL" | "COLLEGE" | "MADRASA" | "OPEN") || "SCHOOL",
    seriesStart: data.seriesStart,
  });
}

export async function deleteGroupAction(festivalId: string, id: string) {
  return GroupService.delete(id, festivalId);
}

export async function updateGroupAction(
  festivalId: string,
  id: string,
  data: { name: string; type?: string; seriesStart?: number },
) {
  return GroupService.update(id, festivalId, {
    name: data.name,
    type: (data.type as "SCHOOL" | "COLLEGE" | "MADRASA" | "OPEN") || "SCHOOL",
    seriesStart: data.seriesStart,
  });
}
