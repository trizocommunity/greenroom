import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createStudent(data: Prisma.StudentCreateInput) {
  return prisma.student.create({
    data,
  });
}

export async function deleteStudent(id: string) {
  return prisma.student.delete({
    where: { id },
  });
}

export async function updateStudent(
  id: string,
  data: Prisma.StudentUpdateInput,
) {
  return prisma.student.update({
    where: { id },
    data,
  });
}

export async function findStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: { category: true, group: true }, // Include relations
  });
}

export async function findStudentByFestivalAndProfileSlug(
  festivalId: string,
  profileSlug: string,
) {
  return prisma.student.findFirst({
    where: { festivalId, profileSlug },
    include: {
      category: true,
      group: true,
      assignments: {
        include: {
          programme: { include: { category: true } },
        },
      },
    },
  });
}

export async function findStudentsByFestival(
  festivalId: string,
  groupId?: string,
) {
  const where: Prisma.StudentWhereInput = { festivalId };
  if (groupId) where.groupId = groupId;

  return prisma.student.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true, group: true },
  });
}

export async function countStudents(festivalId: string) {
  return prisma.student.count({
    where: { festivalId },
  });
}
