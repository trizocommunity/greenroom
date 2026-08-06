import { db } from "@/core/database/client";
import { generalEntryAward, group as groupTable } from "@/core/database/schema";
import { and, eq, sql } from "drizzle-orm";

export type GeneralEntryStandingRow = {
  name: string;
  points: number;
  isGroup: boolean;
};

export async function computeGeneralEntryStandings(
  festivalId: string
): Promise<GeneralEntryStandingRow[]> {
  const results = await db
    .select({
      groupName: groupTable.name,
      points: sql<number>`SUM(${generalEntryAward.points})::int`,
    })
    .from(generalEntryAward)
    .innerJoin(groupTable, eq(generalEntryAward.groupId, groupTable.id))
    .where(
      and(
        eq(groupTable.festivalId, festivalId),
        eq(generalEntryAward.isPublished, true)
      )
    )
    .groupBy(groupTable.name);

  return results.map((r) => ({
    name: r.groupName,
    points: r.points,
    isGroup: true,
  }));
}
