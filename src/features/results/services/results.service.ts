import { asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivals } from "@/core/database/schema";

export async function getFestivalResultsDataBySlug(slug: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      categories: { orderBy: [asc(festivals.name)] },
      programmes: {
        with: {
          category: true,
          assignments: {
            with: {
              student: true,
              group: true,
              result: true,
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
