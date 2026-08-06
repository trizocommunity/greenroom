import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  participant as participantTable,
  programme as programmeTable,
  programmeAssignment,
  result as resultTable,
} from "@/core/database/schema";
import {
  formatParticipantLabel,
  type ProgrammeResultRow,
  resolveAssignmentDisplays,
} from "@/features/announcement/services/result-display.resolver";

export type PublishedResultProgramme = {
  id: string;
  name: string;
  type: string;
  categoryName: string | null;
  resultNumber: number | null;
  publishedAt: string | null;
  publishedByName: string | null;
  results: ProgrammeResultRow[];
};

type ResultQueryRow = {
  id: string;
  programmeId: string;
  position: number | null;
  points: number | null;
  awardPoints: number | null;
  grade: string | null;
  publishedByName: string | null;
  groupName: string | null;
  teamNumber: number | null;
  assignmentId: string;
  individualParticipantName: string | null;
  individualChestNumber: string | null;
};

export async function getPublishedResults(
  festivalId: string,
): Promise<PublishedResultProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      eq(programmeTable.status, "ANNOUNCED"),
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

  const displayByAssignment = await resolveAssignmentDisplays(results);

  const resultsByProgramme = new Map<string, ResultQueryRow[]>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  return programmes.map((p) => {
    const progResults = resultsByProgramme.get(p.id) ?? [];

    let finalResults = progResults;
    if (p.type === "GROUP") {
      const teamMap = new Map<string, ResultQueryRow>();
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
      results: finalResults.map((r) => ({
        id: r.id,
        position: r.position,
        points: r.awardPoints ?? r.points ?? 0,
        grade: r.grade,
        isPublished: true,
        participantName: formatParticipantLabel(p.type, displayByAssignment.get(r.assignmentId)),
        chestNumber: displayByAssignment.get(r.assignmentId)?.chestNumber ?? null,
        groupName: r.groupName,
        teamNumber: r.teamNumber,
        codeLetter: null,
        awardPoints: r.awardPoints ?? 0,
      })),
    };
  });
}
