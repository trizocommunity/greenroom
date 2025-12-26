import { ParticipantService } from "@/server/services/participant.service";

export async function index(editionId: string, groupId?: string) {
  return ParticipantService.getAll(editionId, groupId);
}

export async function store(editionId: string, data: any) {
  if (!data.name || !data.groupId || !data.categoryId) {
    throw new Error("Name, Group, and Category are required");
  }

  return ParticipantService.create(editionId, data);
}

export async function destroy(id: string, editionId: string) {
  return ParticipantService.delete(id, editionId);
}
