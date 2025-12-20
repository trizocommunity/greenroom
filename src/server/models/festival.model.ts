import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 1 Festival Model

export async function findAllFestivals(
  where: Prisma.FestivalWhereInput = {},
  orderBy: Prisma.FestivalOrderByWithRelationInput = { createdAt: "desc" },
) {
  return prisma.festival.findMany({
    where,
    orderBy,
    include: { owner: true, editions: true },
  });
}

export async function findFestivalById(id: string) {
  return prisma.festival.findUnique({
    where: { id },
    include: { owner: true, editions: true },
  });
}

// Note: Slug is removed in Phase 1 schema.
// If needed for UI, we might need to re-add it or use ID.
// For now, removing findFestivalBySlug helpers as they break strict Phase 1 compliance.

export async function createFestival(data: Prisma.FestivalCreateInput) {
  return prisma.festival.create({
    data,
  });
}

export async function updateFestival(
  id: string,
  data: Prisma.FestivalUpdateInput,
) {
  return prisma.festival.update({
    where: { id },
    data,
  });
}

export async function deleteFestival(id: string) {
  return prisma.festival.delete({
    where: { id },
  });
}

// Helper to check if a user already owns a festival
export async function findFestivalByOwnerId(ownerId: string) {
  return prisma.festival.findUnique({
    where: { ownerId },
  });
}
