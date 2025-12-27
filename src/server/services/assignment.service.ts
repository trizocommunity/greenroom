import { prisma } from "@/lib/db";
import {
  checkAssignmentExists,
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
} from "@/server/models/assignment.model";
import { findFestivalById } from "@/server/models/festival.model";
import { findParticipantById } from "@/server/models/participant.model";
import { findProgrammeById } from "@/server/models/programme.model";

export const AssignmentService = {
  async getAll(festivalId: string) {
    return prisma.programmeAssignment.findMany({
      where: { festivalId },
      include: {
        programme: true,
        participant: true,
        group: true,
      },
      orderBy: { assignedAt: "desc" },
    });
  },

  async getByProgramme(programmeId: string) {
    return findAssignmentsByProgramme(programmeId);
  },

  async create(
    festivalId: string,
    data: { programmeId: string; participantId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    // Verify Programme
    const programme = await findProgrammeById(data.programmeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new Error("Invalid Programme");

    if (!data.participantId && !data.groupId) {
      throw new Error("Either participantId or groupId is required");
    }

    if (data.participantId) {
      // Verify Participant
      const participant = await findParticipantById(data.participantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new Error("Invalid Participant");

      // Category Match Rule
      if (programme.categoryId !== participant.categoryId) {
        throw new Error(
          "Participant category does not match Programme category",
        );
      }

      // Check Duplicate
      const exists = await checkAssignmentExists(
        data.programmeId,
        data.participantId,
      );
      if (exists) throw new Error("Already assigned");

      return createAssignment({
        festival: { connect: { id: festivalId } },
        programme: { connect: { id: data.programmeId } },
        participant: { connect: { id: data.participantId } },
        ...(participant.groupId
          ? { group: { connect: { id: participant.groupId } } }
          : {}),
        assignedAt: new Date(),
      });
    }

    // Group-based assignment
    return createAssignment({
      festival: { connect: { id: festivalId } },
      programme: { connect: { id: data.programmeId } },
      ...(data.groupId ? { group: { connect: { id: data.groupId } } } : {}),
      assignedAt: new Date(),
    });
  },

  async delete(id: string, _festivalId?: string) {
    return deleteAssignment(id);
  },

  // Aliases for backwards compatibility
  async assign(festivalId: string, programmeId: string, participantId: string) {
    return this.create(festivalId, { programmeId, participantId });
  },

  async remove(id: string, festivalId?: string) {
    return this.delete(id, festivalId);
  },
};
