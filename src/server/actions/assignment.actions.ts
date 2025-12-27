"use server";

import { AssignmentService } from "@/server/services/assignment.service";

export async function getAssignmentsAction(festivalId: string) {
  return AssignmentService.getAll(festivalId);
}

export async function createAssignmentAction(
  festivalId: string,
  data: {
    programmeId: string;
    participantId?: string;
    groupId?: string;
  },
) {
  return AssignmentService.create(festivalId, data);
}

export async function deleteAssignmentAction(festivalId: string, id: string) {
  return AssignmentService.delete(id, festivalId);
}
