import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function createParticipant(data: Prisma.ParticipantCreateInput) {
  return prisma.participant.create({
    data,
  });
}

export async function deleteParticipant(id: string) {
  return prisma.participant.delete({
    where: { id },
  });
}

export async function findParticipantsByEdition(editionId: string) {
  return prisma.participant.findMany({
    where: { editionId },
    orderBy: { createdAt: "desc" },
  });
}

export async function countParticipants(editionId: string) {
  return prisma.participant.count({
    where: { editionId },
  });
}
