import { prisma } from "@/lib/db";

export async function getFestivalResultsDataBySlug(slug: string) {
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { name: "asc" } },
      programmes: {
        include: {
          category: true,
          assignments: {
            include: {
              student: true,
              group: true,
              result: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!festival) {
    return { festival: null };
  }

  return { festival };
}

