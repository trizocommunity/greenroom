"use server";

import { GroupService } from "@/server/services/group.service";

export async function getGroupsAction(festivalId: string) {
  return GroupService.getAll(festivalId);
}

export async function createGroupAction(
  festivalId: string,
  data: { name: string; type?: string },
) {
  return GroupService.create(festivalId, {
    name: data.name,
    type: (data.type as "SCHOOL" | "COLLEGE" | "MADRASA" | "OPEN") || "SCHOOL",
  });
}

export async function deleteGroupAction(festivalId: string, id: string) {
  return GroupService.delete(id, festivalId);
}
