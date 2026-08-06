import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programmeCodeLetter as programmeCodeLetterTable,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
  result as resultTable,
} from "@/core/database/schema";

export type AnnouncerQueueProgramme = {
  id: string;
  name: string;
  type: string;
  stageType: string;
  status: string;
  categoryName: string | null;
  resultNumber: number | null;
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

type ResultRowBase = {
  id: string;
  programmeId: string;
  position: number | null;
  points: number | null;
  awardPoints: number | null;
  grade: string | null;
  isPublished: boolean;
  groupName: string | null;
  teamNumber: number | null;
};

export async function getAnnouncerQueue(
  festivalId: string,
): Promise<AnnouncerQueueProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      inArray(programmeTable.status, ["PENDING_PUBLICATION"]),
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
      groupName: groupTable.name,
      teamNumber: programmeAssignment.teamNumber,
      assignmentId: programmeAssignment.id,
      individualParticipantName: participantTable.name,
      individualChestNumber: participantTable.chestNumber,
      participantId: programmeAssignment.participantId,
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
    .leftJoin(
      groupTable,
      or(
        eq(programmeAssignment.groupId, groupTable.id),
        eq(participantTable.groupId, groupTable.id),
      ),
    )
    .where(eq(resultTable.festivalId, festivalId))
    .orderBy(asc(resultTable.position));

  if (results.length === 0) return [];

  const groupTeamKeys = new Set<string>();
  for (const r of results) {
    if (r.groupName != null) {
      groupTeamKeys.add(
        `${r.programmeId}:${r.groupName}:${r.teamNumber ?? "-"}`,
      );
    }
  }

  const leadByAssignment = await loadTeamLeadsForAssignments(
    results.map((r) => r.assignmentId),
  );
  const memberDisplayByAssignment = await loadFirstMemberDisplay(
    results.map((r) => r.assignmentId),
  );

  const displayByAssignment = new Map<
    string,
    { name: string | null; chestNumber: string | null; isTeamLeader: boolean }
  >();
  for (const r of results) {
    const lead = leadByAssignment.get(r.assignmentId);
    if (lead) {
      displayByAssignment.set(r.assignmentId, {
        name: lead.name,
        chestNumber: lead.chestNumber,
        isTeamLeader: true,
      });
    } else if (r.individualParticipantName) {
      displayByAssignment.set(r.assignmentId, {
        name: r.individualParticipantName,
        chestNumber: r.individualChestNumber,
        isTeamLeader: false,
      });
    } else {
      const m = memberDisplayByAssignment.get(r.assignmentId);
      displayByAssignment.set(r.assignmentId, {
        name: m?.name ?? null,
        chestNumber: m?.chestNumber ?? null,
        isTeamLeader: false,
      });
    }
  }

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: eq(programmeCodeLetterTable.festivalId, festivalId),
    columns: { programmeId: true, code: true },
    with: {
      programmeCodeLetterRecipients: {
        columns: { participantId: true, assignmentMemberId: true },
      },
    },
  });

  const assignmentIds = results.map((r) => r.assignmentId);
  const assignmentMembers =
    assignmentIds.length > 0
      ? await db.query.programmeAssignmentMember.findMany({
          where: inArray(programmeAssignmentMember.assignmentId, assignmentIds),
          columns: { id: true, assignmentId: true },
        })
      : [];

  const assignmentCodeMap = new Map<string, string>();
  for (const cl of codeLetters) {
    const recipient = cl.programmeCodeLetterRecipients[0];
    if (recipient) {
      let assignmentId: string | undefined;
      if (recipient.assignmentMemberId) {
        assignmentId = assignmentMembers.find(
          (m) => m.id === recipient.assignmentMemberId,
        )?.assignmentId;
      }
      if (!assignmentId && recipient.participantId) {
        assignmentId = results.find(
          (r) =>
            r.programmeId === cl.programmeId &&
            r.participantId === recipient.participantId,
        )?.assignmentId;
      }
      if (assignmentId) {
        assignmentCodeMap.set(assignmentId, cl.code);
      }
    }
  }

  const resultsByProgramme = new Map<string, typeof results>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  return programmes
    .filter((p) => {
      const progResults = resultsByProgramme.get(p.id) ?? [];
      return progResults.length > 0 && progResults.some((r) => !r.isPublished);
    })
    .map((p) => {
      const progResults = resultsByProgramme.get(p.id) ?? [];

      let finalResults = progResults;
      if (p.type === "GROUP") {
        const teamMap = new Map<string, (typeof progResults)[0]>();
        for (const r of progResults) {
          const key = `${r.groupName ?? ""}:${r.teamNumber ?? ""}`;
          const display = displayByAssignment.get(r.assignmentId);
          const prefer = !teamMap.has(key) || (display?.isTeamLeader ?? false);
          if (prefer) {
            teamMap.set(key, r);
          }
        }
        finalResults = Array.from(teamMap.values());
      }

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        stageType: p.stageType,
        status: p.status,
        categoryName: p.category?.name ?? null,
        resultNumber: p.resultNumber,
        results: finalResults.map((r) => {
          const display = displayByAssignment.get(r.assignmentId);
          const label =
            p.type === "GROUP"
              ? display?.name
                ? `${display.name} and team`
                : "Team"
              : (display?.name ?? null);
          return {
            id: r.id,
            position: r.position,
            points: r.awardPoints ?? r.points,
            grade: r.grade,
            isPublished: r.isPublished,
            participantName: label,
            chestNumber: display?.chestNumber ?? null,
            groupName: r.groupName,
            teamNumber: r.teamNumber,
            codeLetter: assignmentCodeMap.get(r.assignmentId) ?? null,
            awardPoints: r.awardPoints ?? 0,
          };
        }),
      };
    });
}

async function loadTeamLeadsForAssignments(
  assignmentIds: string[],
): Promise<Map<string, { name: string | null; chestNumber: string | null }>> {
  const map = new Map<
    string,
    { name: string | null; chestNumber: string | null }
  >();
  if (assignmentIds.length === 0) return map;

  const rows = await db
    .select({
      assignmentId: programmeAssignment.id,
      name: participantTable.name,
      chestNumber: participantTable.chestNumber,
    })
    .from(programmeAssignment)
    .innerJoin(
      programmeTeamLeadTable,
      and(
        eq(programmeTeamLeadTable.programmeId, programmeAssignment.programmeId),
        eq(programmeTeamLeadTable.groupId, programmeAssignment.groupId),
        eq(programmeTeamLeadTable.teamNumber, programmeAssignment.teamNumber),
      ),
    )
    .innerJoin(
      participantTable,
      eq(participantTable.id, programmeTeamLeadTable.participantId),
    )
    .where(inArray(programmeAssignment.id, assignmentIds));

  for (const row of rows) {
    map.set(row.assignmentId, {
      name: row.name,
      chestNumber: row.chestNumber,
    });
  }
  return map;
}

export type PublishedResultProgramme = {
  id: string;
  name: string;
  type: string;
  categoryName: string | null;
  resultNumber: number | null;
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
    codeLetter: string | null;
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
    orderBy: [asc(programmeTable.resultNumber)],
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
      groupName: groupTable.name,
      teamNumber: programmeAssignment.teamNumber,
      assignmentId: programmeAssignment.id,
      individualParticipantName: participantTable.name,
      individualChestNumber: participantTable.chestNumber,
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
        eq(resultTable.isPublished, true),
      ),
    )
    .orderBy(asc(resultTable.position));

  if (results.length === 0) return [];

  const leadByAssignment = await loadTeamLeadsForAssignments(
    results.map((r) => r.assignmentId),
  );
  const memberDisplayByAssignment = await loadFirstMemberDisplay(
    results.map((r) => r.assignmentId),
  );
  const displayByAssignment = new Map<
    string,
    { name: string | null; chestNumber: string | null; isTeamLeader: boolean }
  >();
  for (const r of results) {
    const lead = leadByAssignment.get(r.assignmentId);
    if (lead) {
      displayByAssignment.set(r.assignmentId, {
        name: lead.name,
        chestNumber: lead.chestNumber,
        isTeamLeader: true,
      });
    } else if (r.individualParticipantName) {
      displayByAssignment.set(r.assignmentId, {
        name: r.individualParticipantName,
        chestNumber: r.individualChestNumber,
        isTeamLeader: false,
      });
    } else {
      const m = memberDisplayByAssignment.get(r.assignmentId);
      displayByAssignment.set(r.assignmentId, {
        name: m?.name ?? null,
        chestNumber: m?.chestNumber ?? null,
        isTeamLeader: false,
      });
    }
  }

  const resultsByProgramme = new Map<string, typeof results>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  return programmes.map((p) => {
    const progResults = resultsByProgramme.get(p.id) ?? [];

    let finalResults = progResults;
    if (p.type === "GROUP") {
      const teamMap = new Map<string, (typeof progResults)[0]>();
      for (const r of progResults) {
        const key = `${r.groupName ?? ""}:${r.teamNumber ?? ""}`;
        const display = displayByAssignment.get(r.assignmentId);
        const prefer = !teamMap.has(key) || (display?.isTeamLeader ?? false);
        if (prefer) teamMap.set(key, r);
      }
      finalResults = Array.from(teamMap.values());
    }

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      categoryName: p.category?.name ?? null,
      resultNumber: p.resultNumber,
      publishedAt: p.publishedAt,
      publishedByName: progResults[0]?.publishedByName ?? null,
      results: finalResults.map((r) => {
        const display = displayByAssignment.get(r.assignmentId);
        const label =
          p.type === "GROUP"
            ? display?.name
              ? `${display.name} and team`
              : "Team"
            : (display?.name ?? null);
        return {
          id: r.id,
          position: r.position,
          points: r.awardPoints ?? r.points,
          grade: r.grade,
          participantName: label,
          chestNumber: display?.chestNumber ?? null,
          groupName: r.groupName,
          teamNumber: r.teamNumber,
          codeLetter: null,
          awardPoints: r.awardPoints ?? 0,
        };
      }),
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
  upToResultNumber?: number
): Promise<TeamStandingRow[]> {
  const publishedFilter =
    scope === "published" ? eq(resultTable.isPublished, true) : undefined;
  const resultNumberFilter = upToResultNumber 
    ? sql`${programmeTable.resultNumber} <= ${upToResultNumber}`
    : undefined;

  const [results, groups] = await Promise.all([
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
          resultNumberFilter
        )
      ),
    db.query.group.findMany({
      where: eq(groupTable.festivalId, festivalId),
      columns: { name: true },
    }),
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
      standingsPublishedAtResultNumber: true,
      standingsPublishedAt: true,
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
    standingsPublishedAtResultNumber:
      festival?.standingsPublishedAtResultNumber ?? null,
    standingsPublishedAt: festival?.standingsPublishedAt ?? null,
    highestPublishedResultNumber: highestPublishedResult[0]?.maxNum ?? null,
  };
}

async function loadFirstMemberDisplay(
  assignmentIds: string[],
): Promise<Map<string, { name: string | null; chestNumber: string | null }>> {
  const map = new Map<
    string,
    { name: string | null; chestNumber: string | null }
  >();
  if (assignmentIds.length === 0) return map;

  const rows = await db
    .select({
      assignmentId: programmeAssignmentMember.assignmentId,
      participantId: programmeAssignmentMember.participantId,
      name: participantTable.name,
      chestNumber: participantTable.chestNumber,
    })
    .from(programmeAssignmentMember)
    .innerJoin(
      participantTable,
      eq(participantTable.id, programmeAssignmentMember.participantId),
    )
    .where(inArray(programmeAssignmentMember.assignmentId, assignmentIds))
    .orderBy(asc(programmeAssignmentMember.assignedAt));

  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.assignmentId)) continue;
    seen.add(row.assignmentId);
    map.set(row.assignmentId, {
      name: row.name,
      chestNumber: row.chestNumber,
    });
  }
  return map;
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

export async function getResultsConsoleProgrammes(
  festivalId: string,
): Promise<AnnouncerQueueProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      inArray(programmeTable.status, ["PENDING_PUBLICATION", "PUBLISHED", "ANNOUNCED"]),
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
      groupName: groupTable.name,
      teamNumber: programmeAssignment.teamNumber,
      assignmentId: programmeAssignment.id,
      individualParticipantName: participantTable.name,
      individualChestNumber: participantTable.chestNumber,
      participantId: programmeAssignment.participantId,
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
    .leftJoin(
      groupTable,
      or(
        eq(programmeAssignment.groupId, groupTable.id),
        eq(participantTable.groupId, groupTable.id),
      ),
    )
    .where(eq(resultTable.festivalId, festivalId))
    .orderBy(asc(resultTable.position));

  if (results.length === 0) return [];

  const leadByAssignment = await loadTeamLeadsForAssignments(
    results.map((r) => r.assignmentId),
  );
  const memberDisplayByAssignment = await loadFirstMemberDisplay(
    results.map((r) => r.assignmentId),
  );

  const displayByAssignment = new Map<
    string,
    { name: string | null; chestNumber: string | null; isTeamLeader: boolean }
  >();
  for (const r of results) {
    const lead = leadByAssignment.get(r.assignmentId);
    if (lead) {
      displayByAssignment.set(r.assignmentId, {
        name: lead.name,
        chestNumber: lead.chestNumber,
        isTeamLeader: true,
      });
    } else if (r.individualParticipantName) {
      displayByAssignment.set(r.assignmentId, {
        name: r.individualParticipantName,
        chestNumber: r.individualChestNumber,
        isTeamLeader: false,
      });
    } else {
      const m = memberDisplayByAssignment.get(r.assignmentId);
      displayByAssignment.set(r.assignmentId, {
        name: m?.name ?? null,
        chestNumber: m?.chestNumber ?? null,
        isTeamLeader: false,
      });
    }
  }

  const codeLetters = await db.query.programmeCodeLetter.findMany({
    where: eq(programmeCodeLetterTable.festivalId, festivalId),
    columns: { programmeId: true, code: true },
    with: {
      programmeCodeLetterRecipients: {
        columns: { participantId: true, assignmentMemberId: true },
      },
    },
  });

  const assignmentIds = results.map((r) => r.assignmentId);
  const assignmentMembers =
    assignmentIds.length > 0
      ? await db.query.programmeAssignmentMember.findMany({
          where: inArray(programmeAssignmentMember.assignmentId, assignmentIds),
          columns: { id: true, assignmentId: true },
        })
      : [];

  const assignmentCodeMap = new Map<string, string>();
  for (const cl of codeLetters) {
    const recipient = cl.programmeCodeLetterRecipients[0];
    if (recipient) {
      let assignmentId: string | undefined;
      if (recipient.assignmentMemberId) {
        assignmentId = assignmentMembers.find(
          (m) => m.id === recipient.assignmentMemberId,
        )?.assignmentId;
      }
      if (!assignmentId && recipient.participantId) {
        assignmentId = results.find(
          (r) =>
            r.programmeId === cl.programmeId &&
            r.participantId === recipient.participantId,
        )?.assignmentId;
      }
      if (assignmentId) {
        assignmentCodeMap.set(assignmentId, cl.code);
      }
    }
  }

  const resultsByProgramme = new Map<string, typeof results>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  return programmes
    .map((p) => {
      const progResults = resultsByProgramme.get(p.id) ?? [];

      let finalResults = progResults;
      if (p.type === "GROUP") {
        const teamMap = new Map<string, (typeof progResults)[0]>();
        for (const r of progResults) {
          const key = `${r.groupName ?? ""}:${r.teamNumber ?? ""}`;
          const display = displayByAssignment.get(r.assignmentId);
          const prefer = !teamMap.has(key) || (display?.isTeamLeader ?? false);
          if (prefer) {
            teamMap.set(key, r);
          }
        }
        finalResults = Array.from(teamMap.values());
      }

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        stageType: p.stageType,
        status: p.status,
        categoryName: p.category?.name ?? null,
        resultNumber: p.resultNumber,
        results: finalResults.map((r) => {
          const display = displayByAssignment.get(r.assignmentId);
          const label =
            p.type === "GROUP"
              ? display?.name
                ? `${display.name} and team`
                : "Team"
              : (display?.name ?? null);
          return {
            id: r.id,
            position: r.position,
            points: r.awardPoints ?? r.points,
            grade: r.grade,
            isPublished: r.isPublished,
            participantName: label,
            chestNumber: display?.chestNumber ?? null,
            groupName: r.groupName,
            teamNumber: r.teamNumber,
            codeLetter: assignmentCodeMap.get(r.assignmentId) ?? null,
            awardPoints: r.awardPoints ?? 0,
          };
        }),
      };
    });
}

export type ParticipantTopScorerRow = {
  id: string;
  rank: number;
  name: string;
  gender: string;
  groupName: string;
  categoryName: string;
  chestNumber: string | null;
  stagePoints: number;
  offstagePoints: number;
  totalPoints: number;
  programmes: {
    id: string;
    name: string;
    type: string;
    stageType: string;
    points: number;
  }[];
};

export async function getParticipantTopScorers(
  festivalId: string,
): Promise<ParticipantTopScorerRow[]> {
  const [participants, results, assignments, assignmentMembers] = await Promise.all([
    db.query.participant.findMany({
      where: eq(participantTable.festivalId, festivalId),
      with: {
        group: { columns: { name: true } },
        category: { columns: { name: true } },
      },
    }),
    db
      .select({
        id: resultTable.id,
        points: resultTable.points,
        awardPoints: resultTable.awardPoints,
        isPublished: resultTable.isPublished,
        programmeId: resultTable.programmeId,
        programmeName: programmeTable.name,
        programmeType: programmeTable.type,
        programmeStageType: programmeTable.stageType,
        assignmentId: resultTable.assignmentId,
      })
      .from(resultTable)
      .innerJoin(programmeTable, eq(resultTable.programmeId, programmeTable.id))
      .where(
        and(
          eq(resultTable.festivalId, festivalId),
          eq(resultTable.isPublished, true)
        )
      ),
    db.query.programmeAssignment.findMany({
      where: eq(programmeAssignment.festivalId, festivalId),
    }),
    db.query.programmeAssignmentMember.findMany({
      where: eq(programmeAssignmentMember.festivalId, festivalId),
    }),
  ]);

  const assignmentToParticipants = new Map<string, string[]>();
  for (const a of assignments) {
    if (a.participantId) {
      assignmentToParticipants.set(a.id, [a.participantId]);
    }
  }
  for (const am of assignmentMembers) {
    const list = assignmentToParticipants.get(am.assignmentId) ?? [];
    list.push(am.participantId);
    assignmentToParticipants.set(am.assignmentId, list);
  }

  const participantPoints = new Map<string, { stage: number; offstage: number; programmes: ParticipantTopScorerRow["programmes"] }>();

  for (const p of participants) {
    participantPoints.set(p.id, { stage: 0, offstage: 0, programmes: [] });
  }

  for (const r of results) {
    const pts = r.awardPoints ?? r.points ?? 0;
    const isStage = r.programmeStageType === "STAGE";
    const participantsInAssignment = assignmentToParticipants.get(r.assignmentId) ?? [];

    for (const pid of participantsInAssignment) {
      const data = participantPoints.get(pid);
      if (data) {
        if (isStage) data.stage += pts;
        else data.offstage += pts;
        data.programmes.push({
          id: r.programmeId,
          name: r.programmeName,
          type: r.programmeType,
          stageType: r.programmeStageType,
          points: pts,
        });
      }
    }
  }

  return participants
    .map((p) => {
      const data = participantPoints.get(p.id)!;
      return {
        id: p.id,
        rank: 0, // Computed below
        name: p.name,
        gender: p.gender,
        groupName: p.group?.name ?? "-",
        categoryName: p.category?.name ?? "-",
        chestNumber: p.chestNumber,
        stagePoints: data.stage,
        offstagePoints: data.offstage,
        totalPoints: data.stage + data.offstage,
        programmes: data.programmes,
      };
    })
    .filter((p) => p.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function getVocalOfTheFest(festivalId: string) {
  const scorers = await getParticipantTopScorers(festivalId);
  const sortedByStage = scorers
    .filter((s) => s.stagePoints > 0)
    .sort((a, b) => b.stagePoints - a.stagePoints);
  return sortedByStage[0] ?? null;
}

export async function getPenOfTheFest(festivalId: string) {
  const scorers = await getParticipantTopScorers(festivalId);
  const sortedByOffstage = scorers
    .filter((s) => s.offstagePoints > 0)
    .sort((a, b) => b.offstagePoints - a.offstagePoints);
  return sortedByOffstage[0] ?? null;
}
