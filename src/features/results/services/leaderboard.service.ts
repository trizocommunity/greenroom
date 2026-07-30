import { asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  category,
  festival as festivals,
  group as groupTable,
} from "@/core/database/schema";

export async function getFestivalLeaderboardDataBySlug(slug: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      categories: { orderBy: [asc(category.name)] },
      groups: { orderBy: [asc(groupTable.name)] },
      programmes: { columns: { id: true, status: true } },
      results: {
        with: {
          programmeAssignment: {
            with: {
              participant: { with: { category: true } },
              group: true,
            },
          },
          programme: {
            columns: { id: true, type: true, status: true },
            with: { category: true },
          },
        },
      },
    },
  });

  if (!festival) {
    return { festival: null, assignmentCount: 0 };
  }

  const programmeIds = festival.programmes.map((p) => p.id);
  let assignmentCount = 0;
  if (programmeIds.length > 0) {
    const [row] = await db
      .select({ c: count() })
      .from(assignmentTable)
      .where(inArray(assignmentTable.programmeId, programmeIds));
    assignmentCount = row?.c ?? 0;
  }

  return {
    festival,
    assignmentCount,
  };
}
