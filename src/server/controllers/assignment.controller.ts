import { AssignmentService } from "@/server/services/assignment.service";

export async function index(programmeId: string) {
  return AssignmentService.getByProgramme(programmeId);
}

export async function store(editionId: string, data: any) {
  if (!data.programmeId || !data.participantId) {
    throw new Error("Programme and Participant are required");
  }

  return AssignmentService.assign(
    editionId,
    data.programmeId,
    data.participantId,
  );
}

export async function destroy(id: string, editionId: string) {
  return AssignmentService.remove(id, editionId);
}
