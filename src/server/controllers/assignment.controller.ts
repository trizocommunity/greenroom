import { AssignmentService } from "@/server/services/assignment.service";

export async function getByProgramme(programmeId: string) {
  return AssignmentService.getByProgramme(programmeId);
}

export async function store(festivalId: string, data: any) {
  if (!data.programmeId || !data.participantId) {
    throw new Error("Programme and Participant are required");
  }

  return AssignmentService.assign(
    festivalId,
    data.programmeId,
    data.participantId,
  );
}

export async function destroy(id: string, festivalId: string) {
  return AssignmentService.remove(id, festivalId);
}
