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
    include: {
      owner: true,
      _count: {
        select: {
          programmes: true,
          students: true,
        },
      },
    },
  });
  if (bySlug) return bySlug;

  // Fallback to ID
  return prisma.festival.findUnique({
    where: { id: slugOrId },
    include: {
      owner: true,
      _count: {
        select: {
          programmes: true,
          students: true,
        },
      },
    },
  });
}

export async function updateTeamStandings(
  festivalId: string,
  standings: Prisma.InputJsonValue,
) {
  return prisma.festival.update({
    where: { id: festivalId },
    data: {
      teamStandings: standings,
    },
  });
}

export async function getDashboardOverviewData(festivalId: string) {
  const [
    totalProgrammes,
    totalStudents,
    totalGroups,
    recentProgrammes,
    recentStudents,
    recentResults,
  ] = await Promise.all([
    prisma.programme.count({ where: { festivalId } }),
    prisma.student.count({ where: { festivalId } }),
    prisma.group.count({ where: { festivalId } }),
    prisma.programme.findMany({
      where: { festivalId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: true },
    }),
    prisma.student.findMany({
      where: { festivalId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { group: true },
    }),
    prisma.result.findMany({
      where: { festivalId, isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        programme: true,
        assignment: {
          include: {
            student: true,
            group: true,
          },
        },
      },
    }),
  ]);

  return {
    totalProgrammes,
    totalStudents,
    totalGroups,
    recentProgrammes,
    recentStudents,
    recentResults,
  };
}
