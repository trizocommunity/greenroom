import { randomUUID } from "crypto";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  programmeAssignment,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
  student as studentTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import {
  checkAssignmentExists,
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
} from "@/features/assignments/repositories/assignment.repository";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { isProTier } from "@/features/plan-features/services/tier";
import type { TeamLeadAppointerRole } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { ProgrammeTeamLeadService } from "@/features/programme-team-leads/services/programme-team-lead.service";
import { findProgrammeById } from "@/features/programmes/repositories/programme.repository";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import { findStudentById } from "@/features/students/repositories/student.repository";

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
        student: {
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
        student: { with: { category: true } },
      },
    });
    return assignments
      .filter((a) => a.student != null)
      .map((a) => ({
        id: a.student!.id,
        name: a.student!.name,
        chestNumber: a.student!.chestNumber,
        categoryName: a.student!.category?.name,
      }));
  },

  async create(
    festivalId: string,
    data: {
      programmeId: string;
      studentId?: string;
      groupId?: string;
      /** Required for GROUP programmes when assigning a student (integer ≥ 1). */
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

    if (!data.studentId && !data.groupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_REQUIRES_PARTICIPANT);
    }

    if (data.studentId) {
      const student = await findStudentById(data.studentId);
      if (!student || student.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_STUDENT);

      const isGeneral = programme.category.type === "GENERAL";

      if (
        programme.type === "INDIVIDUAL" &&
        student.groupId &&
        programme.maxParticipantsPerGroup
      ) {
        const [result] = await db
          .select({ count: count() })
          .from(programmeAssignment)
          .innerJoin(
            studentTable,
            eq(programmeAssignment.studentId, studentTable.id),
          )
          .where(
            and(
              eq(programmeAssignment.programmeId, data.programmeId),
              eq(studentTable.groupId, student.groupId),
            ),
          );

        if (result.count >= programme.maxParticipantsPerGroup) {
          throw new AppError(
            `Max participants from group reached (${programme.maxParticipantsPerGroup})`,
          );
        }
      }

      if (!isGeneral && programme.categoryId !== student.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }

      const exists = await checkAssignmentExists(
        data.programmeId,
        data.studentId,
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
            "Group programmes require a team number (integer ≥ 1) when assigning a student.",
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
        studentId: data.studentId,
        teamNumber,
        ...(student.groupId ? { groupId: student.groupId } : {}),
        assignedAt: new Date().toISOString(),
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
      assignedAt: new Date().toISOString(),
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
    data: { programmeId?: string; studentId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const existing = await db.query.programmeAssignment.findFirst({
      where: eq(programmeAssignment.id, id),
      with: { student: true, programme: true },
    });

    if (!existing) throw new AppError(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    if (existing.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_FESTIVAL);

    const newProgrammeId = data.programmeId || existing.programmeId;
    const newStudentId =
      data.studentId !== undefined ? data.studentId : existing.studentId;
    const newGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;

    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);

    if (!newStudentId && !newGroupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_REQUIRES_PARTICIPANT);
    }

    if (newStudentId) {
      const student = await findStudentById(newStudentId);
      if (!student || student.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_STUDENT);

      const isGeneral = programme.category.type === "GENERAL";
      if (!isGeneral && programme.categoryId !== student.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }

      if (
        newProgrammeId !== existing.programmeId ||
        newStudentId !== existing.studentId
      ) {
        const exists = await checkAssignmentExists(
          newProgrammeId,
          newStudentId,
        );
        if (exists) {
          const conflict = await db.query.programmeAssignment.findFirst({
            where: and(
              eq(programmeAssignment.programmeId, newProgrammeId),
              eq(programmeAssignment.studentId, newStudentId),
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
            studentId: newStudentId,
            groupId: null,
            updatedAt: new Date().toISOString(),
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
          studentId: null,
          groupId: newGroupId!,
          updatedAt: new Date().toISOString(),
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
      replacementLeadStudentId?: string;
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
      existing.studentId
    ) {
      const lead = await db.query.programmeTeamLead.findFirst({
        where: and(
          eq(programmeTeamLeadTable.programmeId, existing.programmeId),
          eq(programmeTeamLeadTable.groupId, existing.groupId),
          eq(programmeTeamLeadTable.teamNumber, existing.teamNumber),
        ),
      });

      if (lead && lead.studentId === existing.studentId) {
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
            "This student is the only member of the team. Delete the whole team instead of removing its last member.",
            "TEAM_WOULD_BE_EMPTY",
          );
        }

        if (!options?.replacementLeadStudentId) {
          throw new AppError(
            "This student is the team lead. Appoint a replacement lead before removing them.",
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
              studentId: options.replacementLeadStudentId!,
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

  async assign(festivalId: string, programmeId: string, studentId: string) {
    return this.create(festivalId, { programmeId, studentId });
  },

  async remove(id: string, festivalId?: string) {
    return this.delete(id, festivalId);
  },

  async bulkCreate(
    festivalId: string,
    assignments: {
      programmeId: string;
      studentId: string;
      teamNumber?: number;
    }[],
    actor?: { createdByEmail?: string; createdByName?: string },
    options?: {
      /** GROUP programmes only, keyed by `${programmeId}:${groupId}:${teamNumber}` -> lead studentId. */
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
        const studentIds = progAssignments.map((a) => a.studentId);
        const students = await tx.query.student.findMany({
          where: inArray(studentTable.id, studentIds),
        });
        const studentMap = new Map(students.map((s) => [s.id, s]));

        const groupIds = new Set<string>();
        students.forEach((s) => {
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
                // Drizzle relational query doesn't support nested student.groupId check easily in 'where'
                // We'll use a more direct approach if needed, but let's try to filter in JS or use sql
              ),
            ),
            with: { student: { columns: { groupId: true } } },
          },
        );

        // Wait, the OR condition above is tricky. Let's use standard SQL for better control.
        const existingRaw = await tx
          .select({
            studentId: programmeAssignment.studentId,
            groupId: programmeAssignment.groupId,
            teamNumber: programmeAssignment.teamNumber,
            studentGroupId: studentTable.groupId,
          })
          .from(programmeAssignment)
          .leftJoin(
            studentTable,
            eq(programmeAssignment.studentId, studentTable.id),
          )
          .where(
            and(
              eq(programmeAssignment.programmeId, programmeId),
              or(
                groupIds.size > 0
                  ? inArray(programmeAssignment.groupId, Array.from(groupIds))
                  : undefined,
                groupIds.size > 0
                  ? inArray(studentTable.groupId, Array.from(groupIds))
                  : undefined,
              ),
            ),
          );

        const participantsPerGroup = new Map<string, number>();
        const teamsPerGroup = new Map<string, Set<number>>();
        const studentsPerTeam = new Map<string, number>();

        existingRaw.forEach((a) => {
          const gid = a.groupId || a.studentGroupId;
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
            studentsPerTeam.set(key, (studentsPerTeam.get(key) || 0) + 1);
          }
        });

        const processedStudentIds = new Set<string>();
        const touchedTeams = new Map<
          string,
          { groupId: string; teamNumber: number }
        >();

        for (const assignment of progAssignments) {
          const { studentId } = assignment;
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
          const student = studentMap.get(studentId);

          if (!student || student.festivalId !== festivalId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_STUDENT);
          }

          if (!isGeneral && programme.categoryId !== student.categoryId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
          }

          const studentGroupId = student.groupId;

          if (studentGroupId) {
            if (programme.type === "GROUP") {
              if (programme.maxTeamsPerGroup) {
                const currentTeams =
                  teamsPerGroup.get(studentGroupId) || new Set();
                if (!currentTeams.has(teamNumber)) {
                  if (currentTeams.size >= programme.maxTeamsPerGroup) {
                    throw new AppError(
                      `Max Teams per Group (${programme.maxTeamsPerGroup}) reached.`,
                    );
                  }
                  currentTeams.add(teamNumber);
                  teamsPerGroup.set(studentGroupId, currentTeams);
                }
              }

              if (programme.maxStudentsPerTeam) {
                const key = `${studentGroupId}_${teamNumber}`;
                const currentCount = studentsPerTeam.get(key) || 0;
                if (currentCount >= programme.maxStudentsPerTeam) {
                  throw new AppError(
                    `Max team size reached for Team ${teamNumber}`,
                  );
                }
                studentsPerTeam.set(key, currentCount + 1);
              }
            } else {
              if (programme.maxParticipantsPerGroup) {
                const currentCount =
                  participantsPerGroup.get(studentGroupId) || 0;
                if (currentCount >= programme.maxParticipantsPerGroup) {
                  throw new AppError(
                    `Group limit reached for ${programme.name}`,
                  );
                }
                participantsPerGroup.set(studentGroupId, currentCount + 1);
              }
            }
          }

          if (
            existingRaw.some((e) => e.studentId === studentId) ||
            processedStudentIds.has(studentId)
          ) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
          }
          processedStudentIds.add(studentId);

          const created = (
            await tx
              .insert(programmeAssignment)
              .values({
                id: randomUUID(),
                festivalId,
                programmeId,
                studentId,
                teamNumber,
                assignedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...(actor?.createdByEmail
                  ? { createdByEmail: actor.createdByEmail }
                  : {}),
                ...(actor?.createdByName
                  ? { createdByName: actor.createdByName }
                  : {}),
                ...(student.groupId ? { groupId: student.groupId } : {}),
              })
              .returning()
          )[0];
          finalResults.push(created);

          if (programme.type === "GROUP" && studentGroupId) {
            touchedTeams.set(`${programmeId}:${studentGroupId}:${teamNumber}`, {
              groupId: studentGroupId,
              teamNumber,
            });
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

            const leadStudentId = teamLeadsByTeam[key];
            if (!leadStudentId) {
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
                studentId: leadStudentId,
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
