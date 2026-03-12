import { prisma } from "@/lib/db";

export interface ResultInput {
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

async function deleteResult(id: string) {
  return prisma.result.delete({
    where: { id },
  });
}

async function findByFestival(festivalId: string, publishedOnly = false) {
  return prisma.result.findMany({
    where: {
      festivalId,
      ...(publishedOnly ? { isPublished: true } : {}),
    },
    include: {
      assignment: {
        include: {
          student: true,
          group: true,
        },
      },
      programme: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [{ programme: { name: "asc" } }, { position: "asc" }],
  });
}

async function findByProgramme(programmeId: string) {
  return prisma.result.findMany({
    where: { programmeId },
    include: {
      assignment: {
        include: {
          student: true,
          group: true,
        },
      },
    },
    orderBy: [{ position: "asc" }],
  });
}

async function togglePublish(id: string, isPublished: boolean) {
  return prisma.result.update({
    where: { id },
    data: { isPublished },
  });
}

async function bulkPublishByProgramme(
  programmeId: string,
  isPublished: boolean,
) {
  return prisma.result.updateMany({
    where: { programmeId },
    data: { isPublished },
  });
}

async function bulkPublishByFestival(festivalId: string, isPublished: boolean) {
  return prisma.result.updateMany({
    where: { festivalId },
    data: { isPublished },
  });
}

async function upsert(assignmentId: string, data: ResultInput) {
  return prisma.result.upsert({
    where: { assignmentId },
    create: data,
    update: {
      grade: data.grade,
      position: data.position,
      points: data.points,
      remarks: data.remarks,
      isPublished: data.isPublished,
    },
    include: {
      assignment: {
        include: {
          student: true,
          group: true,
        },
      },
      programme: true,
    },
  });
}

/** Result Model - Handles competition results CRUD operations (plain object, not a class). */
export const ResultModel = {
  delete: deleteResult,
  findByFestival,
  findByProgramme,
  togglePublish,
  bulkPublishByProgramme,
  bulkPublishByFestival,
  upsert,
};
