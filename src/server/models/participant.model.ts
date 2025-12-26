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

export async function updateParticipant(
  id: string,
  data: Prisma.ParticipantUpdateInput,
) {
  return prisma.participant.update({
    where: { id },
    data,
  });
}

export async function findParticipantById(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    include: { category: true, group: true }, // Include relations
  });
}

export async function findParticipantsByEdition(
  editionId: string,
  groupId?: string,
) {
  const where: Prisma.ParticipantWhereInput = { editionId };
  if (groupId) where.groupId = groupId;

  return prisma.participant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true, group: true },
  });
}

export async function countParticipants(editionId: string) {
  return prisma.participant.count({
    where: { editionId },
  });
}
