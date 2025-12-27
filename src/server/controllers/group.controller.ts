import { GroupService } from "@/server/services/group.service";

export async function index(festivalId: string) {
  return GroupService.getAll(festivalId);
}

export async function store(festivalId: string, data: any) {
  if (!data.name) throw new Error("Name is required");

  return GroupService.create(festivalId, {
    name: data.name,
    type: data.type || "SCHOOL",
  });
}

export async function update(id: string, festivalId: string, data: any) {
  return GroupService.update(id, festivalId, data);
}

export async function destroy(id: string, festivalId: string) {
  return GroupService.delete(id, festivalId);
}
