import { db } from "@/lib/db";
import { festival as festivals } from "../db/schema";
import { eq, desc, asc, and, ne, gte } from "drizzle-orm";

export async function getFestivalLeaderboardDataBySlug(slug: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      categories: { orderBy: [asc(festivals.name)] },
      groups: { orderBy: [asc(festivals.name)] },
      programmes: { columns: { id: true, status: true } },
      results: {
        with: {
          programmeAssignment: {
            with: {
              student: { with: { category: true } },
              group: true,
            },
          },
          programme: {
            with: { category: true },
          },
        },
      },
    },
  });

  if (!festival) {
    return { festival: null, assignmentCount: 0 };
  }

  // Count assignments for this festival's programmes
  const assignmentCount = festival.programmes.reduce(
    (acc, _) => acc,
    0
  );

  return {
    festival,
    assignmentCount,
  };
}
