import { and, asc, desc, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programmeCodeLetter as programmeCodeLetterTable,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";

export type AnnouncerQueueProgramme = {
  id: string;
  name: string;
  type: string;
  status: string;
  categoryName: string | null;
  resultNumber: number | null;
  resultPosterTemplateCode: string | null;
  results: {
    id: string;
    position: number | null;
    points: number;
    grade: string | null;
    isPublished: boolean;
    participantName: string | null;
    chestNumber: string | null;
    groupName: string | null;
    teamNumber: number | null;
    codeLetter: string | null;
    awardPoints: number;
  }[];
};

export async function getAnnouncerQueue(
  festivalId: string,
): Promise<AnnouncerQueueProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      eq(programmeTable.status, "JUDGED"),
    ),
    with: { category: { columns: { name: true } } },
    orderBy: [asc(programmeTable.resultNumber)],
  });

  if (programmes.length === 0) return [];

  const programmeIds = programmes.map((p) => p.id);

  const results = await db
    .select({
      id: resultTable.id,
      programmeId: resultTable.programmeId,
      position: resultTable.position,
      points: resultTable.points,
      awardPoints: resultTable.awardPoints,
      grade: resultTable.grade,
      isPublished: resultTable.isPublished,
      participantName: participantTable.name,
      chestNumber: participantTable.chestNumber,
      groupName: groupTable.name,
      teamNumber: programmeAssignment.teamNumber,
    })
    .from(resultTable)
    .innerJoin(
      programmeAssignment,
      eq(resultTable.assignmentId, programmeAssignment.id),
    )
    .leftJoin(
      participantTable,
      eq(programmeAssignment.participantId, participantTable.id),
    )
    .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(eq(resultTable.festivalId, festivalId))
    .orderBy(asc(resultTable.position));

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: eq(programmeCodeLetterTable.festivalId, festivalId),
    columns: { programmeId: true, code: true },
    with: {
      programmeCodeLetterRecipients: {
        columns: { participantId: true },
      },
    },
  });

  const participantCodeMap = new Map<string, string>();
  for (const cl of codeLetters) {
    for (const r of cl.programmeCodeLetterRecipients ?? []) {
      if (r.participantId) {
        participantCodeMap.set(
          `${cl.programmeId}:${r.participantId}`,
          cl.code,
        );
      }
    }
  }

  const resultsByProgramme = new Map<string, (typeof results)>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  const programmeIdSet = new Set(programmeIds);

  return programmes
    .filter((p) => {
      const progResults = resultsByProgramme.get(p.id) ?? [];
      return progResults.length > 0 && progResults.some((r) => !r.isPublished);
    })
    .map((p) => {
      const progResults = resultsByProgramme.get(p.id) ?? [];
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        categoryName: p.category?.name ?? null,
        resultNumber: p.resultNumber,
        resultPosterTemplateCode: p.resultPosterTemplateCode,
        results: progResults.map((r) => ({
          id: r.id,
          position: r.position,
          points: r.awardPoints ?? r.points,
          grade: r.grade,
          isPublished: r.isPublished,
          participantName: r.participantName,
          chestNumber: r.chestNumber,
          groupName: r.groupName,
          teamNumber: r.teamNumber,
          codeLetter: null as string | null,
          awardPoints: r.awardPoints ?? 0,
        })),
      };
    });
}

export type PublishedResultProgramme = {
  id: string;
  name: string;
  type: string;
  categoryName: string | null;
  resultNumber: number | null;
  resultPosterTemplateCode: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
  results: {
    id: string;
    position: number | null;
    points: number;
    grade: string | null;
    participantName: string | null;
    chestNumber: string | null;
    groupName: string | null;
    teamNumber: number | null;
    awardPoints: number;
  }[];
};

export async function getPublishedResults(
  festivalId: string,
): Promise<PublishedResultProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      eq(programmeTable.status, "PUBLISHED"),
    ),
    with: { category: { columns: { name: true } } },
    orderBy: [desc(programmeTable.resultNumber)],
  });

  if (programmes.length === 0) return [];

  const results = await db
    .select({
      id: resultTable.id,
      programmeId: resultTable.programmeId,
      position: resultTable.position,
      points: resultTable.points,
      awardPoints: resultTable.awardPoints,
      grade: resultTable.grade,
      publishedByName: resultTable.publishedByName,
      participantName: participantTable.name,
      chestNumber: participantTable.chestNumber,
      groupName: groupTable.name,
      teamNumber: programmeAssignment.teamNumber,
    })
    .from(resultTable)
    .innerJoin(
      programmeAssignment,
      eq(resultTable.assignmentId, programmeAssignment.id),
    )
    .leftJoin(
      participantTable,
      eq(programmeAssignment.participantId, participantTable.id),
    )
    .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(
      and(
        eq(resultTable.festivalId, festivalId),
        eq(resultTable.isPublished, true),
      ),
    )
    .orderBy(asc(resultTable.position));

  const resultsByProgramme = new Map<string, (typeof results)>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  return programmes.map((p) => {
    const progResults = resultsByProgramme.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      categoryName: p.category?.name ?? null,
      resultNumber: p.resultNumber,
      resultPosterTemplateCode: p.resultPosterTemplateCode,
      publishedAt: p.publishedAt,
      publishedByName: progResults[0]?.publishedByName ?? null,
      results: progResults.map((r) => ({
        id: r.id,
        position: r.position,
        points: r.awardPoints ?? r.points,
        grade: r.grade,
        participantName: r.participantName,
        chestNumber: r.chestNumber,
        groupName: r.groupName,
        teamNumber: r.teamNumber,
        awardPoints: r.awardPoints ?? 0,
      })),
    };
  });
}

export type TeamStandingRow = {
  name: string;
  points: number;
  rank: number;
  isGroup?: boolean;
};

export async function computeStandings(
  festivalId: string,
  scope: "all" | "published",
): Promise<TeamStandingRow[]> {
  const publishedFilter =
    scope === "published" ? eq(resultTable.isPublished, true) : undefined;

  const results = await db
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
    .innerJoin(
      programmeTable,
      eq(resultTable.programmeId, programmeTable.id),
    )
    .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(
      publishedFilter
        ? and(eq(resultTable.festivalId, festivalId), publishedFilter)
        : eq(resultTable.festivalId, festivalId),
    );

  const standings: Record<
    string,
    { name: string; points: number; isGroup: boolean }
  > = {};
  const countedGroupTeams = new Set<string>();

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

  return Object.values(standings)
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export async function getNextResultNumber(
  festivalId: string,
): Promise<number> {
  const result = await db
    .select({ maxNum: max(programmeTable.resultNumber) })
    .from(programmeTable)
    .where(eq(programmeTable.festivalId, festivalId));
  return (result[0]?.maxNum ?? 0) + 1;
}

export async function getStandingsContext(festivalId: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      teamStandings: true,
      standingsPublishedAtResultNumber: true,
      standingsPublishedAt: true,
    },
  });

  const highestPublishedResult = await db
    .select({ maxNum: max(programmeTable.resultNumber) })
    .from(programmeTable)
    .where(
      and(
        eq(programmeTable.festivalId, festivalId),
        eq(programmeTable.status, "PUBLISHED"),
      ),
    );

  return {
    publishedStandings: (festival?.teamStandings as TeamStandingRow[]) ?? [],
    standingsPublishedAtResultNumber:
      festival?.standingsPublishedAtResultNumber ?? null,
    standingsPublishedAt: festival?.standingsPublishedAt ?? null,
    highestPublishedResultNumber: highestPublishedResult[0]?.maxNum ?? null,
  };
}
