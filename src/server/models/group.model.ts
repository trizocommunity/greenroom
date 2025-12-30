import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createGroup(data: Prisma.GroupCreateInput) {
  return prisma.group.create({
    data,
  });
}

export async function updateGroup(id: string, data: Prisma.GroupUpdateInput) {
  return prisma.group.update({
    where: { id },
    data,
  });
}

export async function deleteGroup(id: string) {
  return prisma.group.delete({
    where: { id },
  });
}

export async function findGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
}

export async function findGroupsByFestival(festivalId: string) {
  return prisma.group.findMany({
    where: { festivalId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { participants: true } },
      participants: {
        where: { isTeamLeader: true },
        select: { id: true, name: true, isTeamLeader: true },
      },
    },
  });
}
