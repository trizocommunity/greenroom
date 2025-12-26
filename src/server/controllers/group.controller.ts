import { GroupService } from "@/server/services/group.service";

export async function index(editionId: string) {
  return GroupService.getAll(editionId);
}

export async function store(editionId: string, data: any) {
  if (!data.name) throw new Error("Name is required");

  return GroupService.create(editionId, {
    name: data.name,
    type: data.type || "SCHOOL",
  });
}

export async function update(id: string, editionId: string, data: any) {
  return GroupService.update(id, editionId, data);
}

export async function destroy(id: string, editionId: string) {
  return GroupService.delete(id, editionId);
}
