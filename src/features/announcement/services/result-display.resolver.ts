import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programmeTeamLead as programmeTeamLeadTable,
} from "@/core/database/schema";

export type DisplayInfo = {
  name: string | null;
  chestNumber: string | null;
  isTeamLeader: boolean;
};

export type ResultDisplayRow = {
  assignmentId: string;
  individualParticipantName: string | null;
  individualChestNumber: string | null;
};

export type ProgrammeResultRow = {
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
};

/**
 * Resolves the display name and chest number for a set of programme assignments.
 *
 * Resolution order for each assignment:
 * 1. Assigned team lead (if any).
 * 2. Individual participant on the assignment.
 * 3. First member of a group assignment.
 */
export async function resolveAssignmentDisplays(
  rows: ResultDisplayRow[],
): Promise<Map<string, DisplayInfo>> {
  const assignmentIds = rows.map((r) => r.assignmentId);
  const leadByAssignment = await loadTeamLeadsForAssignments(assignmentIds);
  const memberDisplayByAssignment = await loadFirstMemberDisplay(assignmentIds);

  return buildAssignmentDisplays(rows, leadByAssignment, memberDisplayByAssignment);
}

export function buildAssignmentDisplays(
  rows: ResultDisplayRow[],
  leadByAssignment: Map<string, { name: string | null; chestNumber: string | null }>,
  memberDisplayByAssignment: Map<string, { name: string | null; chestNumber: string | null }>,
): Map<string, DisplayInfo> {
  const displayByAssignment = new Map<string, DisplayInfo>();
  for (const r of rows) {
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
  return displayByAssignment;
}

export function formatParticipantLabel(
  programmeType: string,
  display: DisplayInfo | undefined,
): string | null {
  if (programmeType === "GROUP") {
    return display?.name ? `${display.name} and team` : "Team";
  }
  return display?.name ?? null;
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
