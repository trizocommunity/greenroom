import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function findMemberByFestivalAndUser(
  festivalId: string,
  userId: string,
) {
  return prisma.festivalMember.findUnique({
    where: {
      festivalId_userId: {
        festivalId,
        userId,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function findMembersByFestival(
  festivalId: string,
  where: Prisma.FestivalMemberWhereInput = {},
) {
  return prisma.festivalMember.findMany({
    where: {
      festivalId,
      ...where,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findMemberById(id: string) {
  return prisma.festivalMember.findUnique({
    where: { id },
  });
}

export async function createMember(data: Prisma.FestivalMemberCreateInput) {
  return prisma.festivalMember.create({
    data,
    include: {
      user: true,
    },
  });
}

export async function deleteMember(id: string) {
  return prisma.festivalMember.delete({
    where: { id },
  });
}
