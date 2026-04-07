import { prisma } from "@/lib/db";

export async function getFestivalLeaderboardDataBySlug(slug: string) {
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { name: "asc" } },
      groups: { orderBy: { name: "asc" } },
      programmes: { select: { id: true, status: true } },
      results: {
        include: {
          assignment: {
            include: {
              student: { include: { category: true } },
              group: true,
            },
          },
          programme: {
            include: { category: true },
          },
        },
      },
    },
  });

  if (!festival) {
    return { festival: null, assignmentCount: 0 };
  }

  const assignmentCount = await prisma.programmeAssignment.count({
    where: {
      programme: {
        festivalId: festival.id,
      },
    },
  });

  return {
    festival,
    assignmentCount,
  };
}
