import { ParticipantService } from "@/server/services/participant.service";

export async function index(festivalId: string, groupId?: string) {
  return ParticipantService.getAll(festivalId, groupId);
}

export async function store(festivalId: string, data: any) {
  if (!data.name || !data.groupId || !data.categoryId) {
    throw new Error("Name, Group, and Category are required");
  }

  return ParticipantService.create(festivalId, data);
}

export async function destroy(id: string, festivalId: string) {
  return ParticipantService.delete(id, festivalId);
}
