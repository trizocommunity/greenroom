import { randomUUID } from "crypto";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
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
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { findParticipantById } from "@/features/participants/repositories/participant.repository";
import { isProTier } from "@/features/plan-features/services/tier";
import type { TeamLeadAppointerRole } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { ProgrammeTeamLeadService } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { findProgrammeById } from "@/features/programmes/repositories/programme.repository";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

export const AssignmentService = {
  async getAll(festivalId: string) {
    return db.query.programmeAssignment.findMany({
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
        group: true,
        category: true,
      },
      orderBy: [desc(programmeAssignment.assignedAt)],
    });
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
    const assignments = await db.query.programmeAssignment.findMany({
      where: and(
        eq(programmeAssignment.festivalId, festivalId),
        eq(programmeAssignment.programmeId, programmeId),
        eq(programmeAssignment.groupId, groupId),
        eq(programmeAssignment.teamNumber, teamNumber),
      ),
      with: {
        participant: { with: { category: true } },
      },
    });
    return assignments
      .filter((a) => a.participant != null)
      .map((a) => ({
        id: a.participant!.id,
        name: a.participant!.name,
        chestNumber: a.participant!.chestNumber,
        categoryName: a.participant!.category?.name,
      }));
  },

  async create(
    festivalId: string,
    data: {
      programmeId: string;
      participantId?: string;
      groupId?: string;
      /** Required for GROUP programmes when assigning a participant (integer ≥ 1). */
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

    if (!data.participantId && !data.groupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_REQUIRES_PARTICIPANT);
    }

    if (data.participantId) {
      const participant = await findParticipantById(data.participantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);

      const isGeneral = programme.category.type === "GENERAL";

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
              eq(programmeAssignment.programmeId, data.programmeId),
              eq(participantTable.groupId, participant.groupId),
            ),
          );

        if (result.count >= programme.maxParticipantsPerGroup) {
          throw new AppError(
            `Max participants from group reached (${programme.maxParticipantsPerGroup})`,
          );
        }
      }

      if (!isGeneral && programme.categoryId !== participant.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }

      const exists = await checkAssignmentExists(
        data.programmeId,
        data.participantId,
      );
      if (exists) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);

      let teamNumber = 1;
      if (programme.type === "GROUP") {
        const tn = data.teamNumber;
        if (
          tn === undefined ||
          tn === null ||
          !Number.isInteger(tn) ||
          tn < 1
        ) {
          throw new AppError(
            "Group programmes require a team number (integer ≥ 1) when assigning a participant.",
          );
        }
        teamNumber = tn;
      } else if (
        data.teamNumber != null &&
        Number.isInteger(data.teamNumber) &&
        data.teamNumber >= 1
      ) {
        teamNumber = data.teamNumber;
      }

      const created = await createAssignment({
        festivalId,
        programmeId: data.programmeId,
        participantId: data.participantId,
        teamNumber,
        ...(participant.groupId ? { groupId: participant.groupId } : {}),
        assignedAt: serverNowIso(),
        ...(actor?.createdByEmail
          ? { createdByEmail: actor.createdByEmail }
          : {}),
        ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
      });
      await updateProgrammeStatus(data.programmeId);
      return created;
    }

    const created = await createAssignment({
      festivalId,
      programmeId: data.programmeId,
      groupId: data.groupId!,
      assignedAt: serverNowIso(),
      ...(actor?.createdByEmail
        ? { createdByEmail: actor.createdByEmail }
        : {}),
      ...(actor?.createdByName ? { createdByName: actor.createdByName } : {}),
    });
    await updateProgrammeStatus(data.programmeId);
    return created;
  },

  async update(
    id: string,
    festivalId: string,
    data: { programmeId?: string; participantId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const existing = await db.query.programmeAssignment.findFirst({
      where: eq(programmeAssignment.id, id),
      with: { participant: true, programme: true },
    });

    if (!existing) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    if (existing.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_FESTIVAL);

    const newProgrammeId = data.programmeId || existing.programmeId;
    const newParticipantId =
      data.participantId !== undefined
        ? data.participantId
        : existing.participantId;
    const newGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;

    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);

    if (!newParticipantId && !newGroupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_REQUIRES_PARTICIPANT);
    }

    if (newParticipantId) {
      const participant = await findParticipantById(newParticipantId);
      if (!participant || participant.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);

      const isGeneral = programme.category.type === "GENERAL";
      if (!isGeneral && programme.categoryId !== participant.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }

      if (
        newProgrammeId !== existing.programmeId ||
        newParticipantId !== existing.participantId
      ) {
        const exists = await checkAssignmentExists(
          newProgrammeId,
          newParticipantId,
        );
        if (exists) {
          const conflict = await db.query.programmeAssignment.findFirst({
            where: and(
              eq(programmeAssignment.programmeId, newProgrammeId),
              eq(programmeAssignment.participantId, newParticipantId),
            ),
          });
          if (conflict && conflict.id !== id)
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
        }
      }

      const updated = (
        await db
          .update(programmeAssignment)
          .set({
            programmeId: newProgrammeId,
            participantId: newParticipantId,
            groupId: null,
            updatedAt: serverNowIso(),
          })
          .where(eq(programmeAssignment.id, id))
          .returning()
      )[0];

      await updateProgrammeStatus(existing.programmeId);
      await updateProgrammeStatus(newProgrammeId);
      return updated;
    }

    const updated = (
      await db
        .update(programmeAssignment)
        .set({
          programmeId: newProgrammeId,
          participantId: null,
          groupId: newGroupId!,
          updatedAt: serverNowIso(),
        })
        .where(eq(programmeAssignment.id, id))
        .returning()
    )[0];

    await updateProgrammeStatus(existing.programmeId);
    await updateProgrammeStatus(newProgrammeId);
    return updated;
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
      with: { programme: { columns: { type: true } } },
    });
    if (!existing) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);

    if (
      existing.programme?.type === "GROUP" &&
      existing.groupId &&
      existing.participantId
    ) {
      const lead = await db.query.programmeTeamLead.findFirst({
        where: and(
          eq(programmeTeamLeadTable.programmeId, existing.programmeId),
          eq(programmeTeamLeadTable.groupId, existing.groupId),
          eq(programmeTeamLeadTable.teamNumber, existing.teamNumber),
        ),
      });

      if (lead && lead.participantId === existing.participantId) {
        const [{ c: remainingCount }] = await db
          .select({ c: count() })
          .from(programmeAssignment)
          .where(
            and(
              eq(programmeAssignment.programmeId, existing.programmeId),
              eq(programmeAssignment.groupId, existing.groupId),
              eq(programmeAssignment.teamNumber, existing.teamNumber),
              sql`${programmeAssignment.id} != ${id}`,
            ),
          );

        if (remainingCount === 0) {
          throw new AppError(
            "This participant is the only member of the team. Delete the whole team instead of removing its last member.",
            "TEAM_WOULD_BE_EMPTY",
          );
        }

        if (!options?.replacementLeadParticipantId) {
          throw new AppError(
            "This participant is the team lead. Appoint a replacement lead before removing them.",
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
      // No FK cascade from assignment -> team lead; clean up the orphaned row.
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
    assignments: {
      programmeId: string;
      participantId: string;
      teamNumber?: number;
    }[],
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
      const finalResults = [];
      const assignmentsByProgramme = new Map<string, typeof assignments>();
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

        const isGeneral = programme.category.type === "GENERAL";
        const participantIds = progAssignments.map((a) => a.participantId);
        const participants = await tx.query.participant.findMany({
          where: inArray(participantTable.id, participantIds),
        });
        const participantMap = new Map(participants.map((s) => [s.id, s]));

        const groupIds = new Set<string>();
        participants.forEach((s) => {
          if (s.groupId) groupIds.add(s.groupId);
        });

        const existingAssignments = await tx.query.programmeAssignment.findMany(
          {
            where: and(
              eq(programmeAssignment.programmeId, programmeId),
              or(
                groupIds.size > 0
                  ? inArray(programmeAssignment.groupId, Array.from(groupIds))
                  : undefined,
                // Drizzle relational query doesn't support nested participant.groupId check easily in 'where'
                // We'll use a more direct approach if needed, but let's try to filter in JS or use sql
              ),
            ),
            with: { participant: { columns: { groupId: true } } },
          },
        );

        // Wait, the OR condition above is tricky. Let's use standard SQL for better control.
        const existingRaw = await tx
          .select({
            participantId: programmeAssignment.participantId,
            groupId: programmeAssignment.groupId,
            teamNumber: programmeAssignment.teamNumber,
            participantGroupId: participantTable.groupId,
          })
          .from(programmeAssignment)
          .leftJoin(
            participantTable,
            eq(programmeAssignment.participantId, participantTable.id),
          )
          .where(
            and(
              eq(programmeAssignment.programmeId, programmeId),
              or(
                groupIds.size > 0
                  ? inArray(programmeAssignment.groupId, Array.from(groupIds))
                  : undefined,
                groupIds.size > 0
                  ? inArray(participantTable.groupId, Array.from(groupIds))
                  : undefined,
              ),
            ),
          );

        const participantsPerGroup = new Map<string, number>();
        const teamsPerGroup = new Map<string, Set<number>>();
        const participantsPerTeam = new Map<string, number>();

        existingRaw.forEach((a) => {
          const gid = a.groupId || a.participantGroupId;
          if (!gid) return;

          participantsPerGroup.set(
            gid,
            (participantsPerGroup.get(gid) || 0) + 1,
          );
          const teams = teamsPerGroup.get(gid) || new Set();
          if (a.teamNumber) teams.add(a.teamNumber);
          teamsPerGroup.set(gid, teams);

          if (a.teamNumber) {
            const key = `${gid}_${a.teamNumber}`;
            participantsPerTeam.set(
              key,
              (participantsPerTeam.get(key) || 0) + 1,
            );
          }
        });

        const processedParticipantIds = new Set<string>();
        const touchedTeams = new Map<
          string,
          { groupId: string; teamNumber: number }
        >();

        for (const assignment of progAssignments) {
          const { participantId } = assignment;
          let teamNumber: number;
          if (programme.type === "GROUP") {
            const tn = assignment.teamNumber;
            if (
              tn === undefined ||
              tn === null ||
              !Number.isInteger(tn) ||
              tn < 1
            ) {
              throw new AppError(
                "Group programme assignments require an explicit integer team number.",
              );
            }
            teamNumber = tn;
          } else {
            const tn = assignment.teamNumber ?? 1;
            teamNumber = Number.isInteger(tn) && tn >= 1 ? tn : 1;
          }
          const participant = participantMap.get(participantId);

          if (!participant || participant.festivalId !== festivalId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PARTICIPANT);
          }

          if (!isGeneral && programme.categoryId !== participant.categoryId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
          }

          const participantGroupId = participant.groupId;

          if (participantGroupId) {
            if (programme.type === "GROUP") {
              if (programme.maxTeamsPerGroup) {
                const currentTeams =
                  teamsPerGroup.get(participantGroupId) || new Set();
                if (!currentTeams.has(teamNumber)) {
                  if (currentTeams.size >= programme.maxTeamsPerGroup) {
                    throw new AppError(
                      `Max Teams per Group (${programme.maxTeamsPerGroup}) reached.`,
                    );
                  }
                  currentTeams.add(teamNumber);
                  teamsPerGroup.set(participantGroupId, currentTeams);
                }
              }

              if (programme.maxParticipantsPerTeam) {
                const key = `${participantGroupId}_${teamNumber}`;
                const currentCount = participantsPerTeam.get(key) || 0;
                if (currentCount >= programme.maxParticipantsPerTeam) {
                  throw new AppError(
                    `Max team size reached for Team ${teamNumber}`,
                  );
                }
                participantsPerTeam.set(key, currentCount + 1);
              }
            } else {
              if (programme.maxParticipantsPerGroup) {
                const currentCount =
                  participantsPerGroup.get(participantGroupId) || 0;
                if (currentCount >= programme.maxParticipantsPerGroup) {
                  throw new AppError(
                    `Group limit reached for ${programme.name}`,
                  );
                }
                participantsPerGroup.set(participantGroupId, currentCount + 1);
              }
            }
          }

          if (
            existingRaw.some((e) => e.participantId === participantId) ||
            processedParticipantIds.has(participantId)
          ) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
          }
          processedParticipantIds.add(participantId);

          const created = (
            await tx
              .insert(programmeAssignment)
              .values({
                id: randomUUID(),
                festivalId,
                programmeId,
                participantId,
                teamNumber,
                assignedAt: serverNowIso(),
                updatedAt: serverNowIso(),
                ...(actor?.createdByEmail
                  ? { createdByEmail: actor.createdByEmail }
                  : {}),
                ...(actor?.createdByName
                  ? { createdByName: actor.createdByName }
                  : {}),
                ...(participant.groupId
                  ? { groupId: participant.groupId }
                  : {}),
              })
              .returning()
          )[0];
          finalResults.push(created);

          if (programme.type === "GROUP" && participantGroupId) {
            touchedTeams.set(
              `${programmeId}:${participantGroupId}:${teamNumber}`,
              {
                groupId: participantGroupId,
                teamNumber,
              },
            );
          }
        }

        if (programme.type === "GROUP" && teamLeadsRequired) {
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
