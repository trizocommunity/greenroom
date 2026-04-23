import { db } from "@/lib/db";
import { festival as festivals } from "../db/schema";
import { eq, asc } from "drizzle-orm";

export async function getFestivalResultsDataBySlug(slug: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      categories: { orderBy: [asc(festivals.name)] },
      programmes: {
        with: {
          category: true,
          programmeAssignments: {
            with: {
              student: true,
              group: true,
              results: true,
            },
          },
        },
        orderBy: [asc(festivals.name)],
      },
    },
  });

  if (!festival) {
    return { festival: null };
  }

  return { festival };
}
