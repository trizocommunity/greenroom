import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createAssignment(
  data: Prisma.ProgrammeAssignmentCreateInput,
) {
  return prisma.programmeAssignment.create({
    data,
  });
}

export async function deleteAssignment(id: string) {
  return prisma.programmeAssignment.delete({
    where: { id },
  });
}

export async function updateAssignment(
  id: string,
  data: Prisma.ProgrammeAssignmentUpdateInput,
) {
  return prisma.programmeAssignment.update({
    where: { id },
    data,
  });
}

export async function findAssignmentsByProgramme(programmeId: string) {
  return prisma.programmeAssignment.findMany({
    where: { programmeId },
    include: {
      student: {
        include: {
          group: true,
        },
      },
      group: true,
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function findAssignmentsByStudent(studentId: string) {
  return prisma.programmeAssignment.findMany({
    where: { studentId },
    include: { programme: true },
    orderBy: { assignedAt: "desc" },
  });
}

export async function checkAssignmentExists(
  programmeId: string,
  studentId: string,
) {
  const assignment = await prisma.programmeAssignment.findUnique({
    where: {
      programmeId_studentId: {
        programmeId,
        studentId,
      },
    },
  });
  return !!assignment;
}
