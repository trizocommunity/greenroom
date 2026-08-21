"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignmentMember as programmeAssignmentMemberTable,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
} from "@/core/database/schema";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { teamKey } from "@/features/programmes/domain/team-key";

/**
 * Fetches every assignment row for the festival, joined with the participant
 * (name + chest number + their own group), the assignment's group, the XOR
 * migration's team members, and the appointed team lead per team. Assembled
 * into the `ProgrammeReportingAssignmentRow` shape consumed by the programme
 * reporting board.
 *
 * The page that mounts the reporting client renders this server-side and
 * passes the result down. There is no call site that needs a single
 * programme's assignments, so this action is festival-scoped.
 */
export async function getProgrammeAssignmentsAction(
  festivalId: string,
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
          inArray(
            assignmentTable.programmeId,
            db
              .select({ id: programmeTable.id })
              .from(programmeTable)
              .where(eq(programmeTable.festivalId, festivalId)),
          ),
        )
        .orderBy(
          asc(groupTable.name),
          asc(participantGroupTable.name),
          asc(assignmentTable.teamNumber),
          asc(participantTable.name),
        ),
      db
        .select({
          assignmentId: programmeAssignmentMemberTable.assignmentId,
          participantId: programmeAssignmentMemberTable.participantId,
          participantName: participantTable.name,
        })
        .from(programmeAssignmentMemberTable)
        .leftJoin(
          participantTable,
          eq(programmeAssignmentMemberTable.participantId, participantTable.id),
        )
        .where(eq(programmeAssignmentMemberTable.festivalId, festivalId)),
      db
        .select({
          programmeId: programmeTeamLeadTable.programmeId,
          groupId: programmeTeamLeadTable.groupId,
          teamNumber: programmeTeamLeadTable.teamNumber,
          participantId: programmeTeamLeadTable.participantId,
          participantName: participantTable.name,
        })
        .from(programmeTeamLeadTable)
        .innerJoin(
          programmeTable,
          eq(programmeTable.id, programmeTeamLeadTable.programmeId),
        )
        .leftJoin(
          participantTable,
          eq(programmeTeamLeadTable.participantId, participantTable.id),
        )
        .where(eq(programmeTable.festivalId, festivalId)),
    ]);

  const teamLeadsMap = new Map<string, { id: string | null; name: string }>();
  for (const tl of teamLeads) {
    if (tl.participantName) {
      teamLeadsMap.set(
        teamKey({
          programmeId: tl.programmeId,
          groupId: tl.groupId,
          teamNumber: tl.teamNumber,
        }),
        { id: tl.participantId, name: tl.participantName },
      );
    }
  }

  const membersByAssignmentId = new Map<
    string,
    { id: string; name: string | null }[]
  >();
  for (const m of assignmentMembersRaw) {
    const existing = membersByAssignmentId.get(m.assignmentId) ?? [];
    existing.push({ id: m.participantId, name: m.participantName });
    membersByAssignmentId.set(m.assignmentId, existing);
  }

  return assignmentRowsRaw.map((row) => {
    const computedGroupId = row.groupId ?? row.participantGroupId ?? null;
    const members = membersByAssignmentId.get(row.id) ?? [];

    const explicitLead = teamLeadsMap.get(
      teamKey({
        programmeId: row.programmeId,
        groupId: computedGroupId,
        teamNumber: row.teamNumber,
      }),
    );

    const teamLeadName = explicitLead?.name ?? members[0]?.name ?? null;
    const teamLeadIdToExclude = explicitLead?.id ?? members[0]?.id ?? null;

    return {
      id: row.id,
      programmeId: row.programmeId,
      participantId: row.participantId ?? null,
      participantName: row.participantName ?? null,
      chestNumber: row.participantChestNumber ?? null,
      groupId: computedGroupId,
      groupName: row.groupName ?? row.participantGroupName ?? null,
      teamNumber: row.teamNumber ?? null,
      teamLeadName,
      teamParticipantIds: members.map((m) => m.id),
      teamMemberNames: members
        .filter((m) => m.id !== teamLeadIdToExclude)
        .map((m) => m.name)
        .filter(Boolean) as string[],
    };
  });
}
