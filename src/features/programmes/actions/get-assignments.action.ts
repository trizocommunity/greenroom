"use server";

import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignmentMember as programmeAssignmentMemberTable,
  programmeTeamLead as programmeTeamLeadTable,
} from "@/core/database/schema";
import type { ProgrammeReportingAssignmentRow } from "@/components/festival/event-works/programme-reporting/types";

export async function getProgrammeAssignmentsAction(
  festivalId: string,
  programmeId: string,
): Promise<ProgrammeReportingAssignmentRow[]> {
  const participantGroupTable = alias(groupTable, "participant_group");

  const [assignmentRowsRaw, assignmentMembersRaw, teamLeads] =
    await Promise.all([
      db
        .select({
          id: assignmentTable.id,
          programmeId: assignmentTable.programmeId,
          participantId: assignmentTable.participantId,
          groupId: assignmentTable.groupId,
          teamNumber: assignmentTable.teamNumber,
          participantName: participantTable.name,
          participantChestNumber: participantTable.chestNumber,
          participantGroupName: participantGroupTable.name,
          participantGroupId: participantGroupTable.id,
          groupName: groupTable.name,
        })
        .from(assignmentTable)
        .leftJoin(
          participantTable,
          eq(assignmentTable.participantId, participantTable.id),
        )
        .leftJoin(groupTable, eq(assignmentTable.groupId, groupTable.id))
        .leftJoin(
          participantGroupTable,
          eq(participantTable.groupId, participantGroupTable.id),
        )
        .where(
          and(
            eq(assignmentTable.festivalId, festivalId),
            eq(assignmentTable.programmeId, programmeId),
          ),
        ),
      db
        .select({
          assignmentId: programmeAssignmentMemberTable.assignmentId,
          participantId: programmeAssignmentMemberTable.participantId,
        })
        .from(programmeAssignmentMemberTable)
        .where(eq(programmeAssignmentMemberTable.festivalId, festivalId)), // can be optimized but fine for now
      db
        .select({
          programmeId: programmeTeamLeadTable.programmeId,
          groupId: programmeTeamLeadTable.groupId,
          teamNumber: programmeTeamLeadTable.teamNumber,
          participantName: participantTable.name,
        })
        .from(programmeTeamLeadTable)
        .leftJoin(
          participantTable,
          eq(programmeTeamLeadTable.participantId, participantTable.id),
        )
        .where(eq(programmeTeamLeadTable.programmeId, programmeId)),
    ]);

  const teamLeadsMap = new Map<string, string>();
  for (const tl of teamLeads) {
    if (tl.participantName) {
      teamLeadsMap.set(
        `${tl.programmeId}::${tl.groupId}::${tl.teamNumber}`,
        tl.participantName,
      );
    }
  }

  const membersByAssignmentId = new Map<string, string[]>();
  for (const m of assignmentMembersRaw) {
    const existing = membersByAssignmentId.get(m.assignmentId) ?? [];
    existing.push(m.participantId);
    membersByAssignmentId.set(m.assignmentId, existing);
  }

  return assignmentRowsRaw.map((row) => {
    const computedGroupId = row.groupId ?? row.participantGroupId ?? null;
    return {
      id: row.id,
      programmeId: row.programmeId,
      participantId: row.participantId ?? null,
      participantName: row.participantName ?? null,
      chestNumber: row.participantChestNumber ?? null,
      groupId: computedGroupId,
      groupName: row.groupName ?? row.participantGroupName ?? null,
      teamNumber: row.teamNumber ?? null,
      teamLeadName:
        teamLeadsMap.get(
          `${row.programmeId}::${computedGroupId}::${row.teamNumber}`,
        ) ?? null,
      teamParticipantIds: membersByAssignmentId.get(row.id) ?? [],
    };
  });
}
