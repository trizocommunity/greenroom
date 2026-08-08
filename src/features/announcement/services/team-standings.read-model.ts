import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import { computeGeneralEntryStandings } from "@/features/general-entries/services/general-entries.standings";

export type TeamStandingRow = {
  name: string;
  points: number;
  rank: number;
  isGroup?: boolean;
};

export async function computeStandings(
  festivalId: string,
  scope: "all" | "published" | "general",
  upToResultNumber?: number,
): Promise<TeamStandingRow[]> {
  if (scope === "general") {
    const generalRows = await computeGeneralEntryStandings(festivalId);
    return generalRows
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }

  const publishedFilter =
    scope === "published" ? eq(resultTable.isPublished, true) : undefined;
  const resultNumberFilter = upToResultNumber
    ? sql`${programmeTable.resultNumber} <= ${upToResultNumber}`
    : undefined;

  const [results, groups, generalRows] = await Promise.all([
    db
      .select({
        id: resultTable.id,
        points: resultTable.points,
        awardPoints: resultTable.awardPoints,
        isPublished: resultTable.isPublished,
        programmeId: resultTable.programmeId,
        programmeType: programmeTable.type,
        groupId: groupTable.id,
        groupName: groupTable.name,
        teamNumber: programmeAssignment.teamNumber,
      })
      .from(resultTable)
      .innerJoin(
        programmeAssignment,
        eq(resultTable.assignmentId, programmeAssignment.id),
      )
      .innerJoin(programmeTable, eq(resultTable.programmeId, programmeTable.id))
      .leftJoin(
        participantTable,
        eq(programmeAssignment.participantId, participantTable.id),
      )
      .leftJoin(
        groupTable,
        or(
          eq(programmeAssignment.groupId, groupTable.id),
          eq(participantTable.groupId, groupTable.id),
        ),
      )
      .where(
        and(
          eq(resultTable.festivalId, festivalId),
          publishedFilter,
          resultNumberFilter,
        ),
      ),
    db.query.group.findMany({
      where: eq(groupTable.festivalId, festivalId),
      columns: { name: true },
    }),
    computeGeneralEntryStandings(festivalId),
  ]);

  const standings: Record<
    string,
    { name: string; points: number; isGroup: boolean }
  > = {};
  const countedGroupTeams = new Set<string>();

  for (const g of groups) {
    standings[g.name] = { name: g.name, points: 0, isGroup: true };
  }

  for (const r of results) {
    const groupName = r.groupName;
    if (!groupName) continue;

    if (r.programmeType === "GROUP") {
      const teamKey = `${r.programmeId}:${r.groupId ?? "na"}:${r.teamNumber ?? 1}`;
      if (countedGroupTeams.has(teamKey)) continue;
      countedGroupTeams.add(teamKey);
    }

    if (!standings[groupName]) {
      standings[groupName] = { name: groupName, points: 0, isGroup: true };
    }
    standings[groupName].points += r.awardPoints ?? r.points ?? 0;
  }

  // General-entry points are always on once published — merge them into
  // programme standings so announcer + results views show the true total.
  for (const g of generalRows) {
    if (!standings[g.name]) {
      standings[g.name] = { name: g.name, points: 0, isGroup: true };
    }
    standings[g.name].points += g.points;
  }

  return Object.values(standings)
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export async function getNextResultNumber(festivalId: string): Promise<number> {
  const result = await db
    .select({ maxNum: sql<number>`MAX(${programmeTable.resultNumber})` })
    .from(programmeTable)
    .where(eq(programmeTable.festivalId, festivalId));
  return (result[0]?.maxNum ?? 0) + 1;
}

export async function getStandingsContext(festivalId: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      teamStandings: true,
      queuedTeamStandings: true,
      standingsPublishedAtResultNumber: true,
      standingsPublishedAt: true,
      standingsAnnouncedAt: true,
    },
  });

  const highestPublishedResult = await db
    .select({ maxNum: sql<number>`MAX(${programmeTable.resultNumber})` })
    .from(programmeTable)
    .where(
      and(
        eq(programmeTable.festivalId, festivalId),
        eq(programmeTable.status, "PUBLISHED"),
      ),
    );

  return {
    publishedStandings: (festival?.teamStandings as TeamStandingRow[]) ?? [],
    queuedTeamStandings:
      (festival?.queuedTeamStandings as TeamStandingRow[]) ?? [],
    standingsPublishedAtResultNumber:
      festival?.standingsPublishedAtResultNumber ?? null,
    standingsPublishedAt: festival?.standingsPublishedAt ?? null,
    standingsAnnouncedAt: festival?.standingsAnnouncedAt ?? null,
    highestPublishedResultNumber: highestPublishedResult[0]?.maxNum ?? null,
  };
}

export async function getProgrammeStatusCounts(festivalId: string) {
  const rows = await db
    .select({
      status: programmeTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(programmeTable)
    .where(
      and(
        eq(programmeTable.festivalId, festivalId),
        sql`${programmeTable.status} != 'CANCELLED'`,
      ),
    )
    .groupBy(programmeTable.status);

  const counts: Record<string, number> = {
    PENDING_JUDGMENT: 0,
    JUDGING: 0,
    PENDING_PUBLICATION: 0,
    PUBLISHED: 0,
    ANNOUNCED: 0,
  };

  for (const row of rows) {
    if (counts[row.status] !== undefined) {
      counts[row.status] = row.count;
    }
  }

  return counts;
}
