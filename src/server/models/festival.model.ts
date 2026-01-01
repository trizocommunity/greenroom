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
    include: { owner: true },
  });
}

export async function findFestivalById(id: string) {
  return prisma.festival.findUnique({
    where: { id },
    include: { owner: true },
  });
}

export async function findFestivalBySlug(slug: string) {
  return prisma.festival.findUnique({
    where: { slug },
    include: { owner: true },
  });
}

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
    include: { owner: true },
  });
}

export async function findFestivalBySlugOrId(slugOrId: string) {
  // Try slug first as it is more common in URLs now
  const bySlug = await prisma.festival.findUnique({
    where: { slug: slugOrId },
    include: { owner: true },
  });
  if (bySlug) return bySlug;

  // Fallback to ID
  return prisma.festival.findUnique({
    where: { id: slugOrId },
    include: { owner: true },
  });
}
