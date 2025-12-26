import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function createGroup(data: Prisma.EditionGroupCreateInput) {
  return prisma.editionGroup.create({
    data,
  });
}

export async function updateGroup(
  id: string,
  data: Prisma.EditionGroupUpdateInput,
) {
  return prisma.editionGroup.update({
    where: { id },
    data,
  });
}

export async function deleteGroup(id: string) {
  return prisma.editionGroup.delete({
    where: { id },
  });
}

export async function findGroupById(id: string) {
  return prisma.editionGroup.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
}

export async function findGroupsByEdition(editionId: string) {
  return prisma.editionGroup.findMany({
    where: { editionId },
    orderBy: { name: "asc" },
    include: { _count: { select: { participants: true } } },
  });
}
