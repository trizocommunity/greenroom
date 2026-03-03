import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import {
  checkAssignmentExists,
  createAssignment,
  deleteAssignment,
  findAssignmentsByProgramme,
} from "@/server/models/assignment.model";
import { findFestivalById } from "@/server/models/festival.model";
import { findProgrammeById } from "@/server/models/programme.model";
import { findStudentById } from "@/server/models/student.model";

export const AssignmentService = {
  async getAll(festivalId: string) {
    return prisma.programmeAssignment.findMany({
      where: { festivalId },
      include: {
        programme: {
          include: {
            category: true,
          },
        },
        student: {
          include: {
            category: true,
            group: true,
          },
        },
        group: true,
        category: true,
      },
      orderBy: { assignedAt: "desc" },
    });
  },

  async getByProgramme(programmeId: string) {
    return findAssignmentsByProgramme(programmeId);
  },

  async create(
    festivalId: string,
    data: { programmeId: string; studentId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

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
        const groupAssignmentCount = await prisma.programmeAssignment.count({
          where: {
            programmeId: data.programmeId,
            student: { groupId: student.groupId },
          },
        });
        if (groupAssignmentCount >= programme.maxParticipantsPerGroup) {
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

      return createAssignment({
        festival: { connect: { id: festivalId } },
        programme: { connect: { id: data.programmeId } },
        student: { connect: { id: data.studentId } },
        ...(student.groupId
          ? { group: { connect: { id: student.groupId } } }
          : {}),
        assignedAt: new Date(),
      });
    }

    return createAssignment({
      festival: { connect: { id: festivalId } },
      programme: { connect: { id: data.programmeId } },
      group: { connect: { id: data.groupId } },
      assignedAt: new Date(),
    });
  },

  async update(
    id: string,
    festivalId: string,
    data: { programmeId?: string; studentId?: string; groupId?: string },
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const existing = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { student: true, programme: true },
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

      if (programme.categoryId !== student.categoryId) {
        throw new AppError(ERROR_MESSAGES.ASSIGNMENT_CATEGORY_MISMATCH);
      }

      if (
        newProgrammeId !== existing.programmeId ||
        newStudentId !== existing.studentId
      ) {
        const exists = await checkAssignmentExists(newProgrammeId, newStudentId);
        if (exists) {
          const conflict = await prisma.programmeAssignment.findUnique({
            where: {
              programmeId_studentId: {
                programmeId: newProgrammeId,
                studentId: newStudentId,
              },
            },
          });
          if (conflict && conflict.id !== id)
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
        }
      }

      return prisma.programmeAssignment.update({
        where: { id },
        data: {
          programmeId: newProgrammeId,
          studentId: newStudentId,
          groupId: null,
        },
      });
    }

    return prisma.programmeAssignment.update({
      where: { id },
      data: {
        programmeId: newProgrammeId,
        studentId: null,
        groupId: newGroupId,
      },
    });
  },

  async delete(id: string, _festivalId?: string) {
    return deleteAssignment(id);
  },

  /**
   * Delete all assignments for a GROUP programme team (programmeId + groupId + teamNumber).
   * Used when the UI shows one row per team and user removes the team.
   */
  async deleteByTeam(
    festivalId: string,
    programmeId: string,
    groupId: string,
    teamNumber: number,
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    const result = await prisma.programmeAssignment.deleteMany({
      where: {
        festivalId,
        programmeId,
        groupId,
        teamNumber,
      },
    });
    return result;
  },

  // Aliases for backwards compatibility
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
  ) {
    const festival = await findFestivalById(festivalId);
    if (festival?.status === "EXPIRED") throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    return prisma.$transaction(
      async (tx) => {
        const results = [];

        const assignmentsByProgramme = new Map<string, typeof assignments>();
        for (const a of assignments) {
          const existing = assignmentsByProgramme.get(a.programmeId) || [];
          existing.push(a);
          assignmentsByProgramme.set(a.programmeId, existing);
        }

        for (const [programmeId, progAssignments] of assignmentsByProgramme) {
          const programme = await tx.programme.findUnique({
            where: { id: programmeId },
            include: {
              category: true,
            },
          });

          if (!programme || programme.festivalId !== festivalId) {
            throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_PROGRAMME);
          }

          const isGeneral = programme.category.type === "GENERAL";

          const studentIds = progAssignments.map((a) => a.studentId);
          const students = await tx.student.findMany({
            where: { id: { in: studentIds } },
          });
          const studentMap = new Map(students.map((s) => [s.id, s]));

          const groupIds = new Set<string>();
          students.forEach((s) => {
            if (s.groupId) groupIds.add(s.groupId);
          });

          const existingAssignments = await tx.programmeAssignment.findMany({
            where: {
              programmeId,
              OR: [
                { groupId: { in: Array.from(groupIds) } },
                { student: { groupId: { in: Array.from(groupIds) } } },
              ],
            },
            select: {
              studentId: true,
              groupId: true,
              teamNumber: true,
              student: { select: { groupId: true } },
            },
          });

          const participantsPerGroup = new Map<string, number>();
          const teamsPerGroup = new Map<string, Set<number>>();
          const studentsPerTeam = new Map<string, number>();

          existingAssignments.forEach((a) => {
            const gid = a.groupId || a.student?.groupId;
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

          for (const assignment of progAssignments) {
            const { studentId, teamNumber = 1 } = assignment;
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
                        `Max Teams per Group (${programme.maxTeamsPerGroup}) reached for this group.`,
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
                      `Max team size (${programme.maxStudentsPerTeam}) reached for Team ${teamNumber}`,
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
                      `Group limit (${programme.maxParticipantsPerGroup}) reached for ${programme.name}`,
                    );
                  }
                  participantsPerGroup.set(studentGroupId, currentCount + 1);
                }
              }
            }

            // Duplicate check: DB pre-fetch + in-batch tracking
            if (
              existingAssignments.some((e) => e.studentId === studentId) ||
              processedStudentIds.has(studentId)
            ) {
              throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ALREADY_EXISTS);
            }
            processedStudentIds.add(studentId);

            const created = await tx.programmeAssignment.create({
              data: {
                festivalId,
                programmeId,
                studentId,
                teamNumber,
                assignedAt: new Date(),
                ...(student.groupId ? { groupId: student.groupId } : {}),
              },
            });
            results.push(created);
          }
        }

        return results;
      },
      {
        maxWait: 5000,
        timeout: 20000,
      },
    );
  },
};
