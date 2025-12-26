import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function createProgramme(data: Prisma.ProgrammeCreateInput) {
  return prisma.programme.create({
    data,
  });
}

export async function updateProgramme(
  id: string,
  data: Prisma.ProgrammeUpdateInput,
) {
  return prisma.programme.update({
    where: { id },
    data,
  });
}

export async function deleteProgramme(id: string) {
  return prisma.programme.delete({
    where: { id },
  });
}

export async function findProgrammeById(id: string) {
  return prisma.programme.findUnique({
    where: { id },
    include: { category: true, _count: { select: { assignments: true } } },
  });
}

export async function findProgrammesByEdition(
  editionId: string,
  categoryId?: string,
) {
  const where: Prisma.ProgrammeWhereInput = { editionId };
  if (categoryId) where.categoryId = categoryId;

  return prisma.programme.findMany({
    where,
    orderBy: { name: "asc" },
    include: { category: true, _count: { select: { assignments: true } } },
  });
}

export async function countProgrammes(editionId: string) {
  return prisma.programme.count({
    where: { editionId },
  });
}
