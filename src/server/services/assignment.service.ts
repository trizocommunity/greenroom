import {
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
  checkAssignmentExists,
} from "@/server/models/assignment.model";
import { findProgrammeById } from "@/server/models/programme.model";
import { findParticipantById } from "@/server/models/participant.model";
import { findEditionById } from "@/server/models/edition.model";

export const AssignmentService = {
  async getByProgramme(programmeId: string) {
    return findAssignmentsByProgramme(programmeId);
  },

  async assign(editionId: string, programmeId: string, participantId: string) {
    const edition = await findEditionById(editionId);
    if (edition?.status === "FREEZE") throw new Error("Edition frozen");

    // 1. Verify Programme
    const programme = await findProgrammeById(programmeId);
    if (!programme || programme.editionId !== editionId)
      throw new Error("Invalid Programme");

    // 2. Verify Participant
    const participant = await findParticipantById(participantId);
    if (!participant || participant.editionId !== editionId)
      throw new Error("Invalid Participant");

    // 3. Category Match Rule
    // "Participant category must match Programme category"
    if (programme.categoryId !== participant.categoryId) {
      throw new Error("Participant category does not match Programme category");
    }

    // 4. Check Duplicate
    const exists = await checkAssignmentExists(programmeId, participantId);
    if (exists) throw new Error("Already assigned");

    // 5. Create
    return createAssignment({
      edition: { connect: { id: editionId } },
      programme: { connect: { id: programmeId } },
      participant: { connect: { id: participantId } },
      ...(participant.groupId
        ? { group: { connect: { id: participant.groupId } } }
        : {}),
      assignedAt: new Date(),
    });
  },

  async remove(id: string, editionId: string) {
    // In future: verify ownership via simple query
    return deleteAssignment(id);
  },
};
