import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  participant as participantTable,
  programme as programmeTable,
  programmeAssignment,
  programmeAssignmentMember,
  programmeCodeLetter as programmeCodeLetterTable,
  result as resultTable,
} from "@/core/database/schema";
import {
  formatParticipantLabel,
  type ProgrammeResultRow,
  resolveAssignmentDisplays,
} from "@/features/announcement/services/result-display.resolver";

export type AnnouncerQueueProgramme = {
  id: string;
  name: string;
  type: string;
  stageType: string;
  status: string;
  categoryName: string | null;
  resultNumber: number | null;
  results: ProgrammeResultRow[];
};

type ResultQueryRow = {
  id: string;
  programmeId: string;
  position: number | null;
  points: number | null;
  awardPoints: number | null;
  grade: string | null;
  isPublished: boolean;
  groupName: string | null;
  teamNumber: number | null;
  assignmentId: string;
  individualParticipantName: string | null;
  individualChestNumber: string | null;
  participantId: string | null;
};

export async function getAnnouncerQueue(
  festivalId: string,
): Promise<AnnouncerQueueProgramme[]> {
  return loadProgrammesWithResults(festivalId, ["PUBLISHED"], {
    filterEmpty: true,
  });
}

export async function getResultsConsoleProgrammes(
  festivalId: string,
): Promise<AnnouncerQueueProgramme[]> {
  return loadProgrammesWithResults(
    festivalId,
    ["PENDING_PUBLICATION", "PUBLISHED", "ANNOUNCED"],
    { filterEmpty: false },
  );
}

async function loadProgrammesWithResults(
  festivalId: string,
  statuses: string[],
  options: { filterEmpty: boolean },
): Promise<AnnouncerQueueProgramme[]> {
  const programmes = await db.query.programme.findMany({
    where: and(
      eq(programmeTable.festivalId, festivalId),
      inArray(
        programmeTable.status,
        statuses as (typeof programmeTable.status.enumValues[number])[],
      ),
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

  const displayByAssignment = await resolveAssignmentDisplays(results);
  const assignmentCodeMap = await buildAssignmentCodeMap(festivalId, results);

  const resultsByProgramme = new Map<string, ResultQueryRow[]>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  const mapped = programmes.map((p) => {
    const progResults = resultsByProgramme.get(p.id) ?? [];

    let finalResults = progResults;
    if (p.type === "GROUP") {
      const teamMap = new Map<string, ResultQueryRow>();
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
      results: finalResults.map((r) =>
        toResultRow(r, p.type, displayByAssignment, assignmentCodeMap),
      ),
    };
  });

  return options.filterEmpty
    ? mapped.filter((p) => p.results.length > 0)
    : mapped;
}

async function buildAssignmentCodeMap(
  festivalId: string,
  results: ResultQueryRow[],
): Promise<Map<string, string>> {
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
  return assignmentCodeMap;
}

function toResultRow(
  r: ResultQueryRow,
  programmeType: string,
  displayByAssignment: Map<
    string,
    { name: string | null; chestNumber: string | null; isTeamLeader: boolean }
  >,
  assignmentCodeMap: Map<string, string>,
): ProgrammeResultRow {
  const display = displayByAssignment.get(r.assignmentId);
  return {
    id: r.id,
    position: r.position,
    points: r.awardPoints ?? r.points ?? 0,
    grade: r.grade,
    isPublished: r.isPublished,
    participantName: formatParticipantLabel(programmeType, display),
    chestNumber: display?.chestNumber ?? null,
    groupName: r.groupName,
    teamNumber: r.teamNumber,
    codeLetter: assignmentCodeMap.get(r.assignmentId) ?? null,
    awardPoints: r.awardPoints ?? 0,
  };
}
