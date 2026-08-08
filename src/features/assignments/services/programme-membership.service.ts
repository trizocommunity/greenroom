import "server-only";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  type category as categoryTable,
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmeTable,
  programmeTeamLead,
} from "@/core/database/schema";

export type EnrolledProgramme = {
  programmeId: string;
  programme: typeof programmeTable.$inferSelect & {
    category: typeof categoryTable.$inferSelect;
  };
  assignmentId: string;
  memberId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  isTeamLeader: boolean;
  categoryId: string;
};

export type EnrolledParticipant = {
  participantId: string;
  participant: typeof participantTable.$inferSelect;
  assignmentId: string;
  memberId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  isTeamLeader: boolean;
};

function leadKey(
  programmeId: string,
  groupId: string | null,
  teamNumber: number | null,
): string {
  return `${programmeId}:${groupId ?? ""}:${teamNumber ?? ""}`;
}

export const ProgrammeMembershipService = {
  /**
   * All programmes a participant is enrolled in, regardless of shape.
   * - INDIVIDUAL: matches via programme_assignment.participantId
   * - GROUP: matches via programme_assignment_member.participantId
   * Scoped to festivalId for safety.
   */
  async getProgrammesForParticipant(
    participantId: string,
    festivalId: string,
  ): Promise<EnrolledProgramme[]> {
    const individualRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        programmeId: programmeAssignment.programmeId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
      })
      .from(programmeAssignment)
      .where(
        and(
          eq(programmeAssignment.participantId, participantId),
          eq(programmeAssignment.festivalId, festivalId),
          isNull(programmeAssignment.groupId),
        ),
      );

    const groupRows = await db
      .select({
        memberId: programmeAssignmentMember.id,
        assignmentId: programmeAssignment.id,
        programmeId: programmeAssignment.programmeId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
      })
      .from(programmeAssignmentMember)
      .innerJoin(
        programmeAssignment,
        eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
      )
      .where(
        and(
          eq(programmeAssignmentMember.participantId, participantId),
          eq(programmeAssignmentMember.festivalId, festivalId),
        ),
      );

    const programmeIds = Array.from(
      new Set([
        ...individualRows.map((r) => r.programmeId),
        ...groupRows.map((r) => r.programmeId),
      ]),
    );

    if (programmeIds.length === 0) return [];

    const programmes = await db.query.programme.findMany({
      where: and(
        inArray(programmeTable.id, programmeIds),
        eq(programmeTable.festivalId, festivalId),
      ),
      with: { category: true },
    });

    const leadRows = await db
      .select({
        programmeId: programmeTeamLead.programmeId,
        groupId: programmeTeamLead.groupId,
        teamNumber: programmeTeamLead.teamNumber,
      })
      .from(programmeTeamLead)
      .where(
        and(
          eq(programmeTeamLead.participantId, participantId),
          inArray(programmeTeamLead.programmeId, programmeIds),
        ),
      );

    const leadSet = new Set(
      leadRows.map((l) => leadKey(l.programmeId, l.groupId, l.teamNumber)),
    );

    return programmes
      .map((programme) => {
        const indiv = individualRows.find(
          (r) => r.programmeId === programme.id,
        );
        const grp = groupRows.find((r) => r.programmeId === programme.id);
        const groupId = indiv?.groupId ?? grp?.groupId ?? null;
        const teamNumber = indiv?.teamNumber ?? grp?.teamNumber ?? null;
        const source = indiv ?? grp;
        if (!source) return null;
        const isTeamLeader =
          groupId !== null && teamNumber !== null
            ? leadSet.has(leadKey(programme.id, groupId, teamNumber))
            : false;
        return {
          programmeId: programme.id,
          programme,
          assignmentId: source.assignmentId,
          memberId: grp?.memberId ?? null,
          groupId,
          teamNumber,
          isTeamLeader,
          categoryId: programme.categoryId,
        } satisfies EnrolledProgramme;
      })
      .filter((row): row is EnrolledProgramme => row !== null);
  },

  /**
   * All participants enrolled in a programme (one row per participant).
   * - INDIVIDUAL: one row per direct assignment
   * - GROUP: one row per programme_assignment_member row
   */
  async getParticipantsForProgramme(
    programmeId: string,
  ): Promise<EnrolledParticipant[]> {
    const individualRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        participantId: programmeAssignment.participantId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
        participant: participantTable,
      })
      .from(programmeAssignment)
      .innerJoin(
        participantTable,
        eq(participantTable.id, programmeAssignment.participantId),
      )
      .where(
        and(
          eq(programmeAssignment.programmeId, programmeId),
          isNotNull(programmeAssignment.participantId),
        ),
      );

    const groupRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        memberId: programmeAssignmentMember.id,
        participantId: programmeAssignmentMember.participantId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
        participant: participantTable,
      })
      .from(programmeAssignmentMember)
      .innerJoin(
        programmeAssignment,
        eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
      )
      .innerJoin(
        participantTable,
        eq(participantTable.id, programmeAssignmentMember.participantId),
      )
      .where(eq(programmeAssignment.programmeId, programmeId));

    const assignmentIds = Array.from(
      new Set([
        ...individualRows.map((r) => r.assignmentId),
        ...groupRows.map((r) => r.assignmentId),
      ]),
    );

    const leadRows = assignmentIds.length
      ? await db
          .select({
            assignmentId: programmeAssignment.id,
            leadParticipantId: programmeTeamLead.participantId,
          })
          .from(programmeTeamLead)
          .innerJoin(
            programmeAssignment,
            and(
              eq(
                programmeAssignment.programmeId,
                programmeTeamLead.programmeId,
              ),
              eq(programmeAssignment.groupId, programmeTeamLead.groupId),
              eq(programmeAssignment.teamNumber, programmeTeamLead.teamNumber),
            ),
          )
          .where(inArray(programmeAssignment.id, assignmentIds))
      : [];

    const leadKeySet = new Set(
      leadRows.map((l) => `${l.assignmentId}:${l.leadParticipantId}`),
    );

    const mappedIndividual: EnrolledParticipant[] = individualRows
      .filter(
        (r): r is typeof r & { participantId: string } =>
          r.participantId !== null,
      )
      .map((r) => ({
        participantId: r.participantId,
        participant: r.participant,
        assignmentId: r.assignmentId,
        memberId: null,
        groupId: r.groupId,
        teamNumber: r.teamNumber,
        isTeamLeader: false,
      }));

    const mappedGroup: EnrolledParticipant[] = groupRows.map((r) => ({
      participantId: r.participantId,
      participant: r.participant,
      assignmentId: r.assignmentId,
      memberId: r.memberId,
      groupId: r.groupId,
      teamNumber: r.teamNumber,
      isTeamLeader: leadKeySet.has(`${r.assignmentId}:${r.participantId}`),
    }));

    return [...mappedIndividual, ...mappedGroup];
  },
};

export {
  isGroupAssignment,
  isIndividualAssignment,
} from "@/features/assignments/utils/assert-assignment-shape";
