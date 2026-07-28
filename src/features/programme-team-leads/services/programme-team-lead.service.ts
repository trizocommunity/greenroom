import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programme as programmeTable,
  programmeTeamLead,
} from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

export type TeamLeadAppointerRole = "ADMIN" | "TEAM_LEADER";

export interface AppointTeamLeadInput {
  programmeId: string;
  groupId: string;
  teamNumber: number;
  participantId: string;
  appointedBy: string;
  appointedByRole: TeamLeadAppointerRole;
  appointedByName?: string;
  appointedByEmail?: string;
}

export interface ReplaceTeamLeadInput {
  programmeId: string;
  groupId: string;
  teamNumber: number;
  participantId: string;
  appointedBy: string;
  appointedByRole: TeamLeadAppointerRole;
  appointedByName?: string;
  appointedByEmail?: string;
}

export interface RemoveTeamLeadInput {
  programmeId: string;
  groupId: string;
  teamNumber: number;
  removedBy: string;
  removedByRole: TeamLeadAppointerRole;
}

async function assertGroupProgramme(executor: any, programmeId: string) {
  const programme = await executor.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
    columns: { id: true, type: true, festivalId: true },
  });
  if (!programme)
    throw new AppError("Programme not found.", "PROGRAMME_NOT_FOUND");
  if (programme.type !== "GROUP") {
    throw new AppError(
      "Team leads only apply to GROUP programmes.",
      "PROGRAMME_NOT_GROUP",
    );
  }
  return programme;
}

async function assertParticipantInTeam(
  executor: any,
  programmeId: string,
  groupId: string,
  teamNumber: number,
  participantId: string,
) {
  const member = await executor.query.programmeAssignment.findFirst({
    where: and(
      eq(assignmentTable.programmeId, programmeId),
      eq(assignmentTable.groupId, groupId),
      eq(assignmentTable.teamNumber, teamNumber),
      eq(assignmentTable.participantId, participantId),
    ),
  });
  if (!member) {
    throw new AppError(
      "The selected lead is not a member of this team.",
      "LEAD_NOT_IN_TEAM",
    );
  }
}

function auditActor(role: TeamLeadAppointerRole, actorId: string) {
  return role === "ADMIN" ? undefined : { actorId, actorRole: role };
}

export const ProgrammeTeamLeadService = {
  async appointTeamLead(input: AppointTeamLeadInput, executor: any = db) {
    await assertGroupProgramme(executor, input.programmeId);
    await assertParticipantInTeam(
      executor,
      input.programmeId,
      input.groupId,
      input.teamNumber,
      input.participantId,
    );

    const existing = await executor.query.programmeTeamLead.findFirst({
      where: and(
        eq(programmeTeamLead.programmeId, input.programmeId),
        eq(programmeTeamLead.groupId, input.groupId),
        eq(programmeTeamLead.teamNumber, input.teamNumber),
      ),
    });
    if (existing) {
      throw new AppError(
        "A team lead is already appointed for this team.",
        "TEAM_LEAD_ALREADY_EXISTS",
      );
    }

    const { randomUUID } = await import("crypto");
    const now = new Date().toISOString();
    const [row] = await executor
      .insert(programmeTeamLead)
      .values({
        id: randomUUID(),
        programmeId: input.programmeId,
        groupId: input.groupId,
        teamNumber: input.teamNumber,
        participantId: input.participantId,
        appointedBy: input.appointedBy,
        appointedByRole: input.appointedByRole,
        appointedByName: input.appointedByName,
        appointedByEmail: input.appointedByEmail,
        appointedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await createAuditLog({
      action: "APPOINT_TEAM_LEAD",
      targetType: "PROGRAMME_TEAM_LEAD",
      targetId: row.id,
      metadata: {
        programmeId: input.programmeId,
        groupId: input.groupId,
        teamNumber: input.teamNumber,
        participantId: input.participantId,
      },
      actor: auditActor(input.appointedByRole, input.appointedBy),
    }).catch((err) =>
      console.error("[AuditLog] APPOINT_TEAM_LEAD failed", err),
    );

    return row;
  },

  async replaceTeamLead(input: ReplaceTeamLeadInput, executor: any = db) {
    await assertGroupProgramme(executor, input.programmeId);
    await assertParticipantInTeam(
      executor,
      input.programmeId,
      input.groupId,
      input.teamNumber,
      input.participantId,
    );

    const existing = await executor.query.programmeTeamLead.findFirst({
      where: and(
        eq(programmeTeamLead.programmeId, input.programmeId),
        eq(programmeTeamLead.groupId, input.groupId),
        eq(programmeTeamLead.teamNumber, input.teamNumber),
      ),
    });
    if (!existing) {
      throw new AppError(
        "No team lead exists for this team yet.",
        "TEAM_LEAD_NOT_FOUND",
      );
    }

    const now = new Date().toISOString();
    const [row] = await executor
      .update(programmeTeamLead)
      .set({
        participantId: input.participantId,
        appointedBy: input.appointedBy,
        appointedByRole: input.appointedByRole,
        appointedByName: input.appointedByName,
        appointedByEmail: input.appointedByEmail,
        appointedAt: now,
        updatedAt: now,
      })
      .where(eq(programmeTeamLead.id, existing.id))
      .returning();

    await createAuditLog({
      action: "REPLACE_TEAM_LEAD",
      targetType: "PROGRAMME_TEAM_LEAD",
      targetId: row.id,
      metadata: {
        programmeId: input.programmeId,
        groupId: input.groupId,
        teamNumber: input.teamNumber,
        previousParticipantId: existing.participantId,
        participantId: input.participantId,
      },
      actor: auditActor(input.appointedByRole, input.appointedBy),
    }).catch((err) =>
      console.error("[AuditLog] REPLACE_TEAM_LEAD failed", err),
    );

    return row;
  },

  async removeTeamLead(input: RemoveTeamLeadInput, executor: any = db) {
    const existing = await executor.query.programmeTeamLead.findFirst({
      where: and(
        eq(programmeTeamLead.programmeId, input.programmeId),
        eq(programmeTeamLead.groupId, input.groupId),
        eq(programmeTeamLead.teamNumber, input.teamNumber),
      ),
    });
    if (!existing) return null;

    await executor
      .delete(programmeTeamLead)
      .where(eq(programmeTeamLead.id, existing.id));

    await createAuditLog({
      action: "REMOVE_TEAM_LEAD",
      targetType: "PROGRAMME_TEAM_LEAD",
      targetId: existing.id,
      metadata: {
        programmeId: input.programmeId,
        groupId: input.groupId,
        teamNumber: input.teamNumber,
        participantId: existing.participantId,
      },
      actor: auditActor(input.removedByRole, input.removedBy),
    }).catch((err) => console.error("[AuditLog] REMOVE_TEAM_LEAD failed", err));

    return existing;
  },

  async getTeamLeadForTeam(
    params: { programmeId: string; groupId: string; teamNumber: number },
    executor: any = db,
  ) {
    return executor.query.programmeTeamLead.findFirst({
      where: and(
        eq(programmeTeamLead.programmeId, params.programmeId),
        eq(programmeTeamLead.groupId, params.groupId),
        eq(programmeTeamLead.teamNumber, params.teamNumber),
      ),
    });
  },

  async getProgrammeTeamLeads(programmeId: string, executor: any = db) {
    const rows = await executor.query.programmeTeamLead.findMany({
      where: eq(programmeTeamLead.programmeId, programmeId),
      with: {
        participant: { columns: { id: true, name: true, chestNumber: true } },
      },
    });

    const grouped: Record<
      string,
      Record<
        number,
        {
          participantId: string;
          participantName: string;
          chestNumber: string | null;
        }
      >
    > = {};

    for (const row of rows as any[]) {
      grouped[row.groupId] ??= {};
      grouped[row.groupId][row.teamNumber] = {
        participantId: row.participantId,
        participantName: row.participant?.name ?? "",
        chestNumber: row.participant?.chestNumber ?? null,
      };
    }

    return grouped;
  },
};
