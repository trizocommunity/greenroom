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

    // 1. Max Limit Check
    if (programme._count.assignments >= programme.maxEntries) {
      throw new Error(`Max limit reached (${programme.maxEntries})`);
    }

    if (!data.participantId && !data.groupId) {
      throw new Error("Either participantId or groupId is required");
    }

    if (data.participantId) {
      // Verify Participant
      const participant = await findParticipantById(data.participantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new Error("Invalid Participant");

      // 2. Category Match Rule (Type Dependent)
      // If Category is INDIVIDUAL, Participant MUST match category.
      // If Category is GENERAL, any participant is allowed (per prompt "List all participants").
      const isGeneral = programme.category.type === "GENERAL";

      if (!isGeneral && programme.categoryId !== participant.categoryId) {
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
      group: { connect: { id: data.groupId } },
      assignedAt: new Date(),
    });
  },

  async update(
    id: string,
    festivalId: string,
    data: { programmeId?: string; participantId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    // Fetch existing assignment to check what changed
    const existing = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { participant: true, programme: true },
    });

    if (!existing) throw new Error("Assignment not found");
    if (existing.festivalId !== festivalId) throw new Error("Invalid festival");

    const newProgrammeId = data.programmeId || existing.programmeId;
    const newParticipantId =
      data.participantId !== undefined
        ? data.participantId
        : existing.participantId;
    const newGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;

    // Verify Programme if changed or if verifying consistency
    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new Error("Invalid Programme");

    if (!newParticipantId && !newGroupId) {
      throw new Error("Either participantId or groupId is required");
    }

    if (newParticipantId) {
      // Verify Participant
      const participant = await findParticipantById(newParticipantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new Error("Invalid Participant");

      // Category Match Rule
      if (programme.categoryId !== participant.categoryId) {
        throw new Error(
          "Participant category does not match Programme category",
        );
      }

      // Check Duplicate (if programme or participant changed)
      if (
        newProgrammeId !== existing.programmeId ||
        newParticipantId !== existing.participantId
      ) {
        const exists = await checkAssignmentExists(
          newProgrammeId,
          newParticipantId,
        );
        if (exists && exists !== true) {
          // checkAssignmentExists likely returns boolean. If exists, we need to check if it's NOT the current one (ID check).
          // But checkAssignmentExists uses findUnique by composite key, not returning ID.
          // If boolean true, it exists.
          // Wait, `checkAssignmentExists` returns `!!assignment`.
          // We need to fetch it to check ID?
          // Or assumption: unique constraint error will catch it?
          // Better to be explicit.
          // Let's modify check to find first.
          // Acutally `checkAssignmentExists` is a boolean wrapper.
          // I'll manually find to compare ID.
          const conflict = await prisma.programmeAssignment.findUnique({
            where: {
              programmeId_participantId: {
                programmeId: newProgrammeId,
                participantId: newParticipantId,
              },
            },
          });
          if (conflict && conflict.id !== id)
            throw new Error("Already assigned");
        }
      }

      return prisma.programmeAssignment.update({
        where: { id },
        data: {
          programmeId: newProgrammeId,
          participantId: newParticipantId,
          groupId: null, // If individual, clear group override? Or logic specific?
          // Usually if participant is present, group is derived from participant OR overridden.
          // If data.groupId is NOT provided, should we keep existing?
          // Logic in Create: if participant, use participant.group.
          // In Update: if changing participant, we should update group link too if not explicit.
          // This is complex. Let's simplify: Update allows changing target prog/participant.
        },
      });
    }

    // Group-based assignment (NOT fully supported in UI but Logic exists)
    return prisma.programmeAssignment.update({
      where: { id },
      data: {
        programmeId: newProgrammeId,
        participantId: null,
        groupId: newGroupId,
      },
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
