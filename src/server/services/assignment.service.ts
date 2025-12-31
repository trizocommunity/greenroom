import { prisma } from "@/lib/db";
import {
  checkAssignmentExists,
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
} from "@/server/models/assignment.model";
import { findFestivalById } from "@/server/models/festival.model";
import { findStudentById } from "@/server/models/student.model";
import { findProgrammeById } from "@/server/models/programme.model";

export const AssignmentService = {
  async getAll(festivalId: string) {
    return prisma.programmeAssignment.findMany({
      where: { festivalId },
      include: {
        programme: true,
        student: true,
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
    data: { programmeId: string; studentId?: string; groupId?: string },
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

    if (!data.studentId && !data.groupId) {
      throw new Error("Either studentId or groupId is required");
    }

    if (data.studentId) {
      // Verify Student
      const student = await findStudentById(data.studentId);
      if (!student || student.festivalId !== festivalId)
        throw new Error("Invalid Student");

      // 2. Category Match Rule (Type Dependent)
      // If Category is INDIVIDUAL, Student MUST match category.
      // If Category is GENERAL, any student is allowed (per prompt "List all students").
      const isGeneral = programme.category.type === "GENERAL";

      if (!isGeneral && programme.categoryId !== student.categoryId) {
        throw new Error("Student category does not match Programme category");
      }

      // Check Duplicate
      const exists = await checkAssignmentExists(
        data.programmeId,
        data.studentId,
      );
      if (exists) throw new Error("Already assigned");

      return createAssignment({
        festival: { connect: { id: festivalId } },
        programme: { connect: { id: data.programmeId } },
        student: { connect: { id: data.studentId } },
        ...(student.groupId
          ? { group: { connect: { id: student.groupId } } }
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
    data: { programmeId?: string; studentId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    // Fetch existing assignment to check what changed
    const existing = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { student: true, programme: true },
    });

    if (!existing) throw new Error("Assignment not found");
    if (existing.festivalId !== festivalId) throw new Error("Invalid festival");

    const newProgrammeId = data.programmeId || existing.programmeId;
    const newStudentId =
      data.studentId !== undefined ? data.studentId : existing.studentId;
    const newGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;

    // Verify Programme if changed or if verifying consistency
    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new Error("Invalid Programme");

    if (!newStudentId && !newGroupId) {
      throw new Error("Either studentId or groupId is required");
    }

    if (newStudentId) {
      // Verify Student
      const student = await findStudentById(newStudentId);
      if (!student || student.festivalId !== festivalId)
        throw new Error("Invalid Student");

      // Category Match Rule
      if (programme.categoryId !== student.categoryId) {
        throw new Error("Student category does not match Programme category");
      }

      // Check Duplicate (if programme or student changed)
      if (
        newProgrammeId !== existing.programmeId ||
        newStudentId !== existing.studentId
      ) {
        const exists = await checkAssignmentExists(
          newProgrammeId,
          newStudentId,
        );
        if (exists) {
          // manually check id to distinguish from self (the check assignment helper checks existence by unique key)
          const conflict = await prisma.programmeAssignment.findUnique({
            where: {
              programmeId_studentId: {
                programmeId: newProgrammeId,
                studentId: newStudentId,
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
          studentId: newStudentId,
          groupId: null,
        },
      });
    }

    // Group-based assignment
    return prisma.programmeAssignment.update({
      where: { id },
      data: {
        programmeId: newProgrammeId,
        studentId: null,
        groupId: newGroupId,
      },
    });
  },

  async delete(id: string, _festivalId?: string) {
    return deleteAssignment(id);
  },

  // Aliases for backwards compatibility
  async assign(festivalId: string, programmeId: string, studentId: string) {
    return this.create(festivalId, { programmeId, studentId });
  },

  async remove(id: string, festivalId?: string) {
    return this.delete(id, festivalId);
  },
};
