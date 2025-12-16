import { prisma } from "@/lib/db";
import { Festival, Prisma } from "@prisma/client";

export async function findAllFestivals(
  where: Prisma.FestivalWhereInput = {},
  orderBy: Prisma.FestivalOrderByWithRelationInput = { createdAt: "desc" }
) {
  return prisma.festival.findMany({
    where,
    orderBy,
  });
}

export async function findFestivalById(id: string) {
  return prisma.festival.findUnique({
    where: { id },
  });
}

export async function findFestivalBySlug(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
  });
}

export async function createFestival(data: Prisma.FestivalCreateInput) {
  return prisma.festival.create({
    data,
  });
}

export async function updateFestival(id: string, data: Prisma.FestivalUpdateInput) {
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

export async function isFestivalSlugTaken(slug: string, excludeId?: string) {
  const where: Prisma.FestivalWhereInput = { slug };
  if (excludeId) {
    where.NOT = { id: excludeId };
  }
  const existing = await prisma.festival.findFirst({ where });
  return !!existing;
}

export async function findFestivalBySlugWithCounts(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      _count: {
        select: {
          programs: true,
          teams: true,
        },
      },
    },
  });
}

export async function findFestivalBySlugWithGallery(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      galleryImages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function findFestivalBySlugWithNews(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      newsItems: {
        orderBy: { publishedAt: "desc" },
      },
    },
  });
}

export async function findFestivalBySlugWithResults(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      programs: {
        orderBy: { name: "asc" },
      },
      teams: {
        orderBy: { rank: "asc" },
      },
    },
  });
}

export async function findFestivalBySlugWithPrograms(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      programs: {
        orderBy: { name: "asc" },
      },
    },
  });
}
