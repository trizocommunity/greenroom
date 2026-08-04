import { randomUUID } from "crypto";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import {
  checkAssignmentExists,
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
} from "@/features/assignments/repositories/assignment.repository";
import { assertAssignmentShape } from "@/features/assignments/utils/assert-assignment-shape";
import { assertProgrammePreReporting } from "@/features/programmes/services/programme-status.service";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { findParticipantById } from "@/features/participants/repositories/participant.repository";
import { isProTier } from "@/features/plan-features/services/tier";
import type { TeamLeadAppointerRole } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { ProgrammeTeamLeadService } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { findProgrammeById } from "@/features/programmes/repositories/programme.repository";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

type BulkAssignmentRow = {
  programmeId: string;
  participantId: string;
  teamNumber?: number;
};

type BulkAssignmentGroupRow = {
  programmeId: string;
  groupId: string;
  teamNumber: number;
  participantIds: string[];
};

export type BulkAssignmentInput = BulkAssignmentRow | BulkAssignmentGroupRow;

function isGroupBulkRow(
  row: BulkAssignmentInput,
): row is BulkAssignmentGroupRow {
  return (
    "groupId" in row &&
    typeof (row as BulkAssignmentGroupRow).groupId === "string"
  );
}

export const AssignmentService = {
  async getAll(festivalId: string) {
    const rows = await db.query.programmeAssignment.findMany({
      where: eq(programmeAssignment.festivalId, festivalId),
      with: {
        programme: {
          with: {
            category: true,
          },
        },
        participant: {
          with: {
            category: true,
            group: true,
          },
        },
        group: {
          with: {
            participants: true,
          },
        },
        category: true,
        members: {
          with: { participant: { with: { category: true, group: true } } },
        },
      },
      orderBy: [desc(programmeAssignment.assignedAt)],
    });

    const fannedOut: any[] = [];
    for (const row of rows) {
      if (row.programme?.type === "GROUP") {
        const seen = new Set<string>();
        for (const m of row.members ?? []) {
          if (!m?.participant) continue;
          if (seen.has(m.participant.id)) continue;
          seen.add(m.participant.id);
          fannedOut.push({
            ...row,
            participant: m.participant,
            teamAssignmentId: row.id,
            synthetic: true,
          });
        }
      } else {
        if (row.participant) fannedOut.push(row);
      }
    }
    return fannedOut;
  },

  async getByProgramme(programmeId: string) {
    return findAssignmentsByProgramme(programmeId);
  },

  async getTeamMembers(
    festivalId: string,
    programmeId: string,
    groupId: string,
    teamNumber: number,
  ): Promise<
    {
      id: string;
      name: string;
      chestNumber?: string | null;
      categoryName?: string;
    }[]
  > {
    const members = await db.query.programmeAssignmentMember.findMany({
      where: and(eq(programmeAssignmentMember.festivalId, festivalId)),
      with: {
        assignment: {
          columns: {
            id: true,
            programmeId: true,
            groupId: true,
            teamNumber: true,
          },
        },
        participant: { with: { category: true } },
      },
    });
    return members
      .filter(
        (m) =>
          m.assignment.programmeId === programmeId &&
          m.assignment.groupId === groupId &&
          (m.assignment.teamNumber ?? 1) === teamNumber,
      )
      .map((m) => ({
        id: m.participant.id,
        name: m.participant.name,
        chestNumber: m.participant.chestNumber,
        categoryName: m.participant.category?.name,
      }));
  },

  async create(
    festivalId: string,
    data:
      | {
          programmeId: string;
          participantId: string;
        }
      | {
          programmeId: string;
          groupId: string;
          teamNumber?: number;
        },
    actor?: { createdByEmail?: string; createdByName?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const programme = await findProgrammeById(data.programmeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);

    assertProgrammePreReporting(programme.status);

    if ("participantId" in data) {
      assertAssignmentShape(programme.type, {
        participantId: data.participantId,
      });
      return this.createIndividualAssignment(
        festivalId,
        programme,
        data,
        actor,
      );
    }

    assertAssignmentShape(programme.type, {
      groupId: data.groupId,
      teamNumber: data.teamNumber ?? 1,
    });
    return this.createGroupTeamAssignment(
      festivalId,
      programme,
      data.groupId,
      data.teamNumber ?? 1,
      actor,
    );
  },

  async createIndividualAssignment(
    festivalId: string,
    programme: {
      id: string;
      type: string;
      maxParticipantsPerGroup?: number | null;
      categoryId: string;
      category?: { type: string } | null;
    },
    data: { participantId: string },
    actor?: { createdByEmail?: string; createdByName?: string },
  ) {
    const participant = await findParticipantById(data.participantId);
    if (!participant || participant.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);

    const isGeneral = programme.category?.type === "GENERAL";
    if (!isGeneral && programme.categoryId !== participant.categoryId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
    }

    if (
      programme.type === "INDIVIDUAL" &&
      participant.groupId &&
      programme.maxParticipantsPerGroup
    ) {
      const [result] = await db
        .select({ count: count() })
        .from(programmeAssignment)
        .innerJoin(
          participantTable,
          eq(programmeAssignment.participantId, participantTable.id),
        )
        .where(
          and(
            eq(programmeAssignment.programmeId, programme.id),
            eq(participantTable.groupId, participant.groupId),
          ),
        );

      if (result.count >= programme.maxParticipantsPerGroup) {
        throw new AppError(
          `Max participants from group reached (${programme.maxParticipantsPerGroup})`,
        );
      }
    }

    const exists = await checkAssignmentExists(
      programme.id,
      data.participantId,
    );
    if (exists) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);

    const created = await createAssignment({
      festivalId,
      programmeId: programme.id,
      participantId: data.participantId,
      teamNumber: 1,
      assignedAt: serverNowIso(),
      updatedAt: serverNowIso(),
      ...(actor?.createdByEmail
        ? { createdByEmail: actor.createdByEmail }
        : {}),
      ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
    });
    await updateProgrammeStatus(programme.id);
    return created;
  },

  async createGroupTeamAssignment(
    festivalId: string,
    programme: {
      id: string;
      type: string;
      maxTeamsPerGroup?: number | null;
      maxParticipantsPerTeam?: number | null;
    },
    groupId: string,
    teamNumber: number,
    actor?: { createdByEmail?: string; createdByName?: string },
  ) {
    const existingTeam = await db.query.programmeAssignment.findFirst({
      where: and(
        eq(programmeAssignment.programmeId, programme.id),
        eq(programmeAssignment.groupId, groupId),
        eq(programmeAssignment.teamNumber, teamNumber),
      ),
    });
    if (existingTeam) {
      throw new AppError(
        `Team ${teamNumber} for this group already exists on this programme.`,
        "TEAM_ALREADY_EXISTS",
      );
    }

    if (programme.maxTeamsPerGroup && programme.maxTeamsPerGroup > 0) {
      const [{ teamCount }] = await db
        .select({
          teamCount: sql<number>`COUNT(DISTINCT (${programmeAssignment.groupId}, ${programmeAssignment.teamNumber}))`,
        })
        .from(programmeAssignment)
        .where(
          and(
            eq(programmeAssignment.programmeId, programme.id),
            eq(programmeAssignment.groupId, groupId),
          ),
        );
      if (teamCount >= programme.maxTeamsPerGroup) {
        throw new AppError(
          `Max teams per group reached (${programme.maxTeamsPerGroup}).`,
        );
      }
    }

    const created = await createAssignment({
      festivalId,
      programmeId: programme.id,
      groupId,
      teamNumber,
      assignedAt: serverNowIso(),
      updatedAt: serverNowIso(),
      ...(actor?.createdByEmail
        ? { createdByEmail: actor.createdByEmail }
        : {}),
      ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
    });
    await updateProgrammeStatus(programme.id);
    return created;
  },

  async update(
    id: string,
    festivalId: string,
    data: {
      programmeId?: string;
      participantId?: string | null;
      groupId?: string | null;
      teamNumber?: number | null;
      memberParticipantIds?: string[];
      memberActor?: { createdByEmail?: string; createdByName?: string };
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const existing = await db.query.programmeAssignment.findFirst({
      where: eq(programmeAssignment.id, id),
      with: { programme: true },
    });

    if (!existing) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    assertProgrammePreReporting(existing.programme.status);
    if (existing.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_FESTIVAL);

    const newProgrammeId = data.programmeId || existing.programmeId;
    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);

    const nextParticipantId =
      data.participantId !== undefined
        ? data.participantId
        : existing.participantId;
    const nextGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;
    const nextTeamNumber =
      data.teamNumber !== undefined && data.teamNumber !== null
        ? data.teamNumber
        : (existing.teamNumber ?? 1);

    assertAssignmentShape(programme.type, {
      participantId: nextParticipantId,
      groupId: nextGroupId,
      teamNumber: nextTeamNumber,
    });

    if (nextParticipantId) {
      const participant = await findParticipantById(nextParticipantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);

      const isGeneral = programme.category?.type === "GENERAL";
      if (!isGeneral && programme.categoryId !== participant.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }
    }

    if (
      nextParticipantId &&
      (newProgrammeId !== existing.programmeId ||
        nextParticipantId !== existing.participantId)
    ) {
      const conflict = await db.query.programmeAssignment.findFirst({
        where: and(
          eq(programmeAssignment.programmeId, newProgrammeId),
          eq(programmeAssignment.participantId, nextParticipantId),
        ),
      });
      if (conflict && conflict.id !== id)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
    }

    const updated = (
      await db
        .update(programmeAssignment)
        .set({
          programmeId: newProgrammeId,
          participantId: nextParticipantId,
          groupId: nextGroupId,
          teamNumber: nextTeamNumber,
          updatedAt: serverNowIso(),
        })
        .where(eq(programmeAssignment.id, id))
        .returning()
    )[0];

    if (programme.type === "GROUP" && data.memberParticipantIds) {
      await this.replaceGroupMembers(
        festivalId,
        id,
        data.memberParticipantIds,
        data.memberActor,
      );
    }

    await updateProgrammeStatus(existing.programmeId);
    await updateProgrammeStatus(newProgrammeId);
    return updated;
  },

  async replaceGroupMembers(
    festivalId: string,
    assignmentId: string,
    participantIds: string[],
    actor?: { createdByEmail?: string; createdByName?: string },
  ) {
    await db
      .delete(programmeAssignmentMember)
      .where(eq(programmeAssignmentMember.assignmentId, assignmentId));

    if (participantIds.length === 0) return;

    const rows = await db.query.participant.findMany({
      where: inArray(participantTable.id, participantIds),
    });
    const validIds = rows
      .filter((r) => r.festivalId === festivalId)
      .map((r) => r.id);
    if (validIds.length === 0) return;

    await db.insert(programmeAssignmentMember).values(
      validIds.map((pid) => ({
        id: randomUUID(),
        assignmentId,
        participantId: pid,
        festivalId,
        assignedAt: serverNowIso(),
        createdAt: serverNowIso(),
        updatedAt: serverNowIso(),
        ...(actor?.createdByEmail
          ? { createdByEmail: actor.createdByEmail }
          : {}),
        ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
      })),
    );
  },

  async delete(
    id: string,
    _festivalId?: string,
    options?: {
      replacementLeadParticipantId?: string;
      appointer?: {
        appointedBy: string;
        appointedByRole: TeamLeadAppointerRole;
        appointedByName?: string;
        appointedByEmail?: string;
      };
    },
  ) {
    const existing = await db.query.programmeAssignment.findFirst({
      where: eq(programmeAssignment.id, id),
      with: { programme: { columns: { type: true, status: true } } },
    });
    if (!existing) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);

    assertProgrammePreReporting(existing.programme.status);

    if (existing.programme?.type === "GROUP" && existing.groupId) {
      const lead = await db.query.programmeTeamLead.findFirst({
        where: and(
          eq(programmeTeamLeadTable.programmeId, existing.programmeId),
          eq(programmeTeamLeadTable.groupId, existing.groupId),
          eq(programmeTeamLeadTable.teamNumber, existing.teamNumber),
        ),
      });

      if (lead) {
        const [{ c: remainingCount }] = await db
          .select({ c: count() })
          .from(programmeAssignmentMember)
          .where(
            and(
              eq(programmeAssignmentMember.assignmentId, id),
              sql`${programmeAssignmentMember.participantId} != ${lead.participantId}`,
            ),
          );

        if (remainingCount === 0) {
          throw new AppError(
            "This team has no remaining members. Delete the whole team instead of removing its last member.",
            "TEAM_WOULD_BE_EMPTY",
          );
        }

        if (!options?.replacementLeadParticipantId) {
          throw new AppError(
            "This team has a lead. Appoint a replacement lead before removing the team.",
            "LEAD_MUST_BE_REPLACED",
          );
        }
        if (!options?.appointer) {
          throw new AppError(
            "Missing appointer context for team lead replacement.",
            "LEAD_MUST_BE_REPLACED",
          );
        }

        const deleted = await db.transaction(async (tx) => {
          await ProgrammeTeamLeadService.replaceTeamLead(
            {
              programmeId: existing.programmeId,
              groupId: existing.groupId!,
              teamNumber: existing.teamNumber,
              participantId: options.replacementLeadParticipantId!,
              ...options.appointer!,
            },
            tx,
          );
          await tx
            .delete(programmeAssignmentMember)
            .where(eq(programmeAssignmentMember.assignmentId, id));
          const [row] = await tx
            .delete(programmeAssignment)
            .where(eq(programmeAssignment.id, id))
            .returning();
          return row;
        });
        await updateProgrammeStatus(deleted.programmeId);
        return deleted;
      }
    }

    await db
      .delete(programmeAssignmentMember)
      .where(eq(programmeAssignmentMember.assignmentId, id));
    const deleted = await deleteAssignment(id);
    await updateProgrammeStatus(deleted.programmeId);
    return deleted;
  },

  async deleteByTeam(
    festivalId: string,
    programmeId: string,
    groupId: string,
    teamNumber: number,
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const programme = await findProgrammeById(programmeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);

    assertProgrammePreReporting(programme.status);
    if (programme.type !== "GROUP") {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_GROUP_ONLY_OPERATION);
    }

    if (!Number.isInteger(teamNumber) || teamNumber < 1) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_TEAM_NUMBER);
    }

    const result = await db
      .delete(programmeAssignment)
      .where(
        and(
          eq(programmeAssignment.festivalId, festivalId),
          eq(programmeAssignment.programmeId, programmeId),
          eq(programmeAssignment.groupId, groupId),
          eq(programmeAssignment.teamNumber, teamNumber),
        ),
      )
      .returning();

    if (result.length > 0) {
      await db
        .delete(programmeAssignmentMember)
        .where(eq(programmeAssignmentMember.assignmentId, result[0].id));
      await db
        .delete(programmeTeamLeadTable)
        .where(
          and(
            eq(programmeTeamLeadTable.programmeId, programmeId),
            eq(programmeTeamLeadTable.groupId, groupId),
            eq(programmeTeamLeadTable.teamNumber, teamNumber),
          ),
        );
      await updateProgrammeStatus(programmeId);
    }
    return { count: result.length };
  },

  async assign(festivalId: string, programmeId: string, participantId: string) {
    return this.create(festivalId, { programmeId, participantId });
  },

  async remove(id: string, festivalId?: string) {
    return this.delete(id, festivalId);
  },

  async bulkCreate(
    festivalId: string,
    assignments: BulkAssignmentInput[],
    actor?: { createdByEmail?: string; createdByName?: string },
    options?: {
      /** GROUP programmes only, keyed by `${programmeId}:${groupId}:${teamNumber}` -> lead participantId. */
      teamLeadsByTeam?: Record<string, string>;
      appointer?: {
        appointedBy: string;
        appointedByRole: TeamLeadAppointerRole;
        appointedByName?: string;
        appointedByEmail?: string;
      };
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const teamLeadsRequired = isProTier(festival?.tier);
    const teamLeadsByTeam = options?.teamLeadsByTeam ?? {};

    return await db.transaction(async (tx) => {
      const finalResults: (typeof programmeAssignment.$inferSelect)[] = [];
      const assignmentsByProgramme = new Map<string, BulkAssignmentInput[]>();
      for (const a of assignments) {
        const existing = assignmentsByProgramme.get(a.programmeId) || [];
        existing.push(a);
        assignmentsByProgramme.set(a.programmeId, existing);
      }

      for (const [programmeId, progAssignments] of assignmentsByProgramme) {
        const programme = await tx.query.programme.findFirst({
          where: eq(programmeTable.id, programmeId),
          with: { category: true },
        });

        if (!programme || programme.festivalId !== festivalId) {
          throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);
        }
        assertProgrammePreReporting(programme.status);

        const prog = programme;
        const isGroupProgramme = programme.type === "GROUP";
        const isGeneral = programme.category?.type === "GENERAL";

        const legacyRows: BulkAssignmentRow[] = [];
        const groupRows: BulkAssignmentGroupRow[] = [];
        for (const row of progAssignments) {
          if (isGroupBulkRow(row)) {
            groupRows.push(row);
          } else {
            legacyRows.push(row);
          }
        }

        if (isGroupProgramme) {
          for (const row of groupRows) {
            assertAssignmentShape(programme.type, {
              groupId: row.groupId,
              teamNumber: row.teamNumber,
            });
          }
        } else {
          for (const row of groupRows) {
            throw new AppError(
              ERROR_MESSAGES.ASSIGNMENT_INDIVIDUAL_REQUIRES_PARTICIPANT,
            );
          }
        }

        const allParticipantIds = new Set<string>();
        for (const row of groupRows) {
          for (const pid of row.participantIds) allParticipantIds.add(pid);
        }
        for (const row of legacyRows) {
          allParticipantIds.add(row.participantId);
        }
        const participants = await tx.query.participant.findMany({
          where: inArray(participantTable.id, Array.from(allParticipantIds)),
        });
        const participantMap = new Map(participants.map((s) => [s.id, s]));

        for (const pid of allParticipantIds) {
          const p = participantMap.get(pid);
          if (!p || p.festivalId !== festivalId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);
          }
          if (!isGeneral && programme.categoryId !== p.categoryId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
          }
        }

        const existingRaw = await tx
          .select({
            participantId: programmeAssignment.participantId,
            groupId: programmeAssignment.groupId,
            teamNumber: programmeAssignment.teamNumber,
          })
          .from(programmeAssignment)
          .where(eq(programmeAssignment.programmeId, programmeId));

        const existingMemberRows = await tx
          .select({
            assignmentId: programmeAssignmentMember.assignmentId,
            participantId: programmeAssignmentMember.participantId,
          })
          .from(programmeAssignmentMember)
          .innerJoin(
            programmeAssignment,
            eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
          )
          .where(eq(programmeAssignment.programmeId, programmeId));
        const memberSetByAssignment = new Map<string, Set<string>>();
        for (const m of existingMemberRows) {
          const set = memberSetByAssignment.get(m.assignmentId) ?? new Set();
          set.add(m.participantId);
          memberSetByAssignment.set(m.assignmentId, set);
        }

        const participantsPerGroup = new Map<string, number>();
        const teamsPerGroup = new Map<string, Set<number>>();
        const participantsPerTeam = new Map<string, number>();
        for (const a of existingRaw) {
          if (!isGroupProgramme) {
            if (!a.participantId) continue;
            const g = participantMap.get(a.participantId)?.groupId;
            if (!g) continue;
            participantsPerGroup.set(g, (participantsPerGroup.get(g) || 0) + 1);
          } else {
            if (!a.groupId) continue;
            const teams = teamsPerGroup.get(a.groupId) || new Set();
            if (a.teamNumber) teams.add(a.teamNumber);
            teamsPerGroup.set(a.groupId, teams);
            if (a.teamNumber) {
              const key = `${a.groupId}_${a.teamNumber}`;
              participantsPerTeam.set(
                key,
                (participantsPerTeam.get(key) || 0) + 1,
              );
            }
          }
        }

        const processedParticipantIds = new Set<string>();
        const touchedTeams = new Map<
          string,
          { groupId: string; teamNumber: number; assignmentId: string }
        >();

        async function insertGroupAssignment(
          gid: string,
          teamNumber: number,
          memberPids: string[],
        ) {
          if (prog.maxTeamsPerGroup && prog.maxTeamsPerGroup > 0) {
            const currentTeams = teamsPerGroup.get(gid) || new Set();
            if (!currentTeams.has(teamNumber)) {
              if (currentTeams.size >= prog.maxTeamsPerGroup) {
                throw new AppError(
                  `Max Teams per Group (${prog.maxTeamsPerGroup}) reached.`,
                );
              }
              currentTeams.add(teamNumber);
              teamsPerGroup.set(gid, currentTeams);
            }
          }

          const existing = await tx.query.programmeAssignment.findFirst({
            where: and(
              eq(programmeAssignment.programmeId, programmeId),
              eq(programmeAssignment.groupId, gid),
              eq(programmeAssignment.teamNumber, teamNumber),
            ),
            columns: { id: true },
          });
          let assignmentId: string;
          if (existing) {
            assignmentId = existing.id;
          } else {
            const [created] = await tx
              .insert(programmeAssignment)
              .values({
                id: randomUUID(),
                festivalId,
                programmeId,
                groupId: gid,
                teamNumber,
                assignedAt: serverNowIso(),
                updatedAt: serverNowIso(),
                ...(actor?.createdByEmail
                  ? { createdByEmail: actor.createdByEmail }
                  : {}),
                ...(actor?.createdByName
                  ? { createdByName: actor.createdByName }
                  : {}),
              })
              .returning();
            finalResults.push(created);
            assignmentId = created.id;
          }

          const existingMembers =
            memberSetByAssignment.get(assignmentId) ?? new Set<string>();
          for (const pid of memberPids) {
            if (processedParticipantIds.has(pid)) {
              throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
            }
            processedParticipantIds.add(pid);
            if (existingMembers.has(pid)) continue;

            if (
              prog.maxParticipantsPerTeam &&
              prog.maxParticipantsPerTeam > 0
            ) {
              const key = `${gid}_${teamNumber}`;
              const currentCount = participantsPerTeam.get(key) || 0;
              if (currentCount >= prog.maxParticipantsPerTeam) {
                throw new AppError(
                  `Max team size reached for Team ${teamNumber}`,
                );
              }
              participantsPerTeam.set(key, currentCount + 1);
            }

            await tx.insert(programmeAssignmentMember).values({
              id: randomUUID(),
              assignmentId,
              participantId: pid,
              festivalId,
              assignedAt: serverNowIso(),
              createdAt: serverNowIso(),
              updatedAt: serverNowIso(),
              ...(actor?.createdByEmail
                ? { createdByEmail: actor.createdByEmail }
                : {}),
              ...(actor?.createdByName
                ? { createdByName: actor.createdByName }
                : {}),
            });
          }

          touchedTeams.set(`${programmeId}:${gid}:${teamNumber}`, {
            groupId: gid,
            teamNumber,
            assignmentId,
          });
        }

        if (isGroupProgramme) {
          for (const row of groupRows) {
            await insertGroupAssignment(
              row.groupId,
              row.teamNumber,
              row.participantIds,
            );
          }

          // Bucket legacy-shape rows by (participant.groupId, teamNumber) and
          // funnel them through the same insertion path as new-shape rows so the
          // GROUP-shape invariant (no participantId on programme_assignment) is
          // preserved regardless of caller shape.
          const legacyBuckets = new Map<
            string,
            { groupId: string; teamNumber: number; memberPids: string[] }
          >();
          for (const row of legacyRows) {
            const participant = participantMap.get(row.participantId);
            if (!participant) {
              throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);
            }
            if (!participant.groupId) {
              throw new AppError(
                "GROUP programme assignment requires participant.groupId.",
              );
            }
            const teamNumber = row.teamNumber ?? 1;
            const key = `${participant.groupId}:${teamNumber}`;
            let bucket = legacyBuckets.get(key);
            if (!bucket) {
              bucket = {
                groupId: participant.groupId,
                teamNumber,
                memberPids: [],
              };
              legacyBuckets.set(key, bucket);
            }
            bucket.memberPids.push(row.participantId);
          }
          for (const bucket of legacyBuckets.values()) {
            await insertGroupAssignment(
              bucket.groupId,
              bucket.teamNumber,
              bucket.memberPids,
            );
          }
        } else {
          for (const row of legacyRows) {
            assertAssignmentShape(prog.type, {
              participantId: row.participantId,
            });
            const participant = participantMap.get(row.participantId);
            if (!participant) continue;
            const gid = participant.groupId ?? null;

            if (
              processedParticipantIds.has(row.participantId) ||
              existingRaw.some((e) => e.participantId === row.participantId)
            ) {
              throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
            }
            processedParticipantIds.add(row.participantId);

            if (gid && prog.maxParticipantsPerGroup) {
              const currentCount = participantsPerGroup.get(gid) || 0;
              if (currentCount >= prog.maxParticipantsPerGroup) {
                throw new AppError(`Group limit reached for ${prog.name}`);
              }
              participantsPerGroup.set(gid, currentCount + 1);
            }

            const [created] = await tx
              .insert(programmeAssignment)
              .values({
                id: randomUUID(),
                festivalId,
                programmeId,
                participantId: row.participantId,
                teamNumber: row.teamNumber ?? 1,
                assignedAt: serverNowIso(),
                updatedAt: serverNowIso(),
                ...(actor?.createdByEmail
                  ? { createdByEmail: actor.createdByEmail }
                  : {}),
                ...(actor?.createdByName
                  ? { createdByName: actor.createdByName }
                  : {}),
              })
              .returning();
            finalResults.push(created);
          }
        }

        if (!isGroupProgramme && legacyRows.length > 0) {
          await insertGroupAssignment;
        }

        if (isGroupProgramme && teamLeadsRequired) {
          for (const [key, { groupId, teamNumber }] of touchedTeams) {
            const existingLead = await tx.query.programmeTeamLead.findFirst({
              where: and(
                eq(programmeTeamLeadTable.programmeId, programmeId),
                eq(programmeTeamLeadTable.groupId, groupId),
                eq(programmeTeamLeadTable.teamNumber, teamNumber),
              ),
            });
            if (existingLead) continue;

            const leadParticipantId = teamLeadsByTeam[key];
            if (!leadParticipantId) {
              throw new AppError(
                "Each team must have a lead selected before saving.",
                "EACH_TEAM_MUST_HAVE_LEAD",
              );
            }
            if (!options?.appointer) {
              throw new AppError(
                "Missing appointer context for team lead.",
                "EACH_TEAM_MUST_HAVE_LEAD",
              );
            }

            await ProgrammeTeamLeadService.appointTeamLead(
              {
                programmeId,
                groupId,
                teamNumber,
                participantId: leadParticipantId,
                ...options.appointer,
              },
              tx,
            );
          }
        }
      }

      for (const programmeId of assignmentsByProgramme.keys()) {
        await updateProgrammeStatus(programmeId);
      }
      return finalResults;
    });
  },
};
