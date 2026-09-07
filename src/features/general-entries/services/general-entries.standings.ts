import { and, eq, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  generalEntry,
  generalEntryAward,
  generalEntryCategory,
  group as groupTable,
} from "@/core/database/schema";

export type GeneralEntryDetail = {
  id: string;
  name: string;
  categoryName?: string | null;
  points: number;
};

export type GeneralEntryStandingRow = {
  name: string;
  points: number;
  isGroup: boolean;
  entries?: GeneralEntryDetail[];
};

export async function computeGeneralEntryStandings(
  festivalId: string,
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
        eq(generalEntryAward.isPublished, true),
      ),
    )
    .groupBy(groupTable.name);

  return results.map((r) => ({
    name: r.groupName,
    points: r.points,
    isGroup: true,
  }));
}

export async function computeGeneralEntryStandingsWithDetails(
  festivalId: string,
): Promise<GeneralEntryStandingRow[]> {
  const results = await db
    .select({
      awardId: generalEntryAward.id,
      groupName: groupTable.name,
      points: generalEntryAward.points,
      entryName: generalEntry.name,
      categoryName: generalEntryCategory.name,
    })
    .from(generalEntryAward)
    .innerJoin(groupTable, eq(generalEntryAward.groupId, groupTable.id))
    .innerJoin(
      generalEntry,
      eq(generalEntryAward.generalEntryId, generalEntry.id),
    )
    .leftJoin(
      generalEntryCategory,
      eq(generalEntry.categoryId, generalEntryCategory.id),
    )
    .where(
      and(
        eq(groupTable.festivalId, festivalId),
        eq(generalEntryAward.isPublished, true),
      ),
    );

  const groupMap = new Map<string, GeneralEntryStandingRow>();

  for (const r of results) {
    let existing = groupMap.get(r.groupName);
    if (!existing) {
      existing = {
        name: r.groupName,
        points: 0,
        isGroup: true,
        entries: [],
      };
      groupMap.set(r.groupName, existing);
    }
    existing.points += r.points;
    existing.entries!.push({
      id: r.awardId,
      name: r.entryName,
      categoryName: r.categoryName ?? null,
      points: r.points,
    });
  }

  return Array.from(groupMap.values());
}
