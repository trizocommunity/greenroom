import { prisma } from "@/lib/db";
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
        category: true, // This is the assignment category (matches student/programme category)
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
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    // Verify Programme
    const programme = await findProgrammeById(data.programmeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new Error("Invalid Programme");

    // 1. Max Limit Check
    // Per user requirement, we only check Per-Group limits for Individual.
    // However, for single assignment creation, we need to know the context (Student's Group).
    // The check is safer done after validating student/group.
    // REMOVED global maxEntries check.

    if (!data.studentId && !data.groupId) {
      throw new Error("Either studentId or groupId is required");
    }

    if (data.studentId) {
      // Verify Student
      const student = await findStudentById(data.studentId);
      if (!student || student.festivalId !== festivalId)
        throw new Error("Invalid Student");

      // 2. Category Match Rule (Type Dependent)
      // If Category is INDIVIDUAL, Student MUST match category.
      // If Category is INDIVIDUAL, Student MUST match category.
      // If Category is GENERAL, any student is allowed (per prompt "List all students").
      const isGeneral = programme.category.type === "GENERAL";

      // Check INDIVIDUAL Limit: Max Participants Per Group
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
          throw new Error(
            `Max participants from group reached (${programme.maxParticipantsPerGroup})`,
          );
        }
      }

      if (!isGeneral && programme.categoryId !== student.categoryId) {
        throw new Error("Student category does not match Programme category");
      }

      // Check Duplicate
      const exists = await checkAssignmentExists(
        data.programmeId,
        data.studentId,
      );
      if (exists) throw new Error("Already assigned");

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

    // Group-based assignment
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
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    // Fetch existing assignment to check what changed
    const existing = await prisma.programmeAssignment.findUnique({
      where: { id },
      include: { student: true, programme: true },
    });

    if (!existing) throw new Error("Assignment not found");
    if (existing.festivalId !== festivalId) throw new Error("Invalid festival");

    const newProgrammeId = data.programmeId || existing.programmeId;
    const newStudentId =
      data.studentId !== undefined ? data.studentId : existing.studentId;
    const newGroupId =
      data.groupId !== undefined ? data.groupId : existing.groupId;

    // Verify Programme if changed or if verifying consistency
    const programme = await findProgrammeById(newProgrammeId);
    if (!programme || programme.festivalId !== festivalId)
      throw new Error("Invalid Programme");

    if (!newStudentId && !newGroupId) {
      throw new Error("Either studentId or groupId is required");
    }

    if (newStudentId) {
      // Verify Student
      const student = await findStudentById(newStudentId);
      if (!student || student.festivalId !== festivalId)
        throw new Error("Invalid Student");

      // Category Match Rule
      if (programme.categoryId !== student.categoryId) {
        throw new Error("Student category does not match Programme category");
      }

      // Check Duplicate (if programme or student changed)
      if (
        newProgrammeId !== existing.programmeId ||
        newStudentId !== existing.studentId
      ) {
        const exists = await checkAssignmentExists(
          newProgrammeId,
          newStudentId,
        );
        if (exists) {
          // manually check id to distinguish from self (the check assignment helper checks existence by unique key)
          const conflict = await prisma.programmeAssignment.findUnique({
            where: {
              programmeId_studentId: {
                programmeId: newProgrammeId,
                studentId: newStudentId,
              },
            },
          });
          if (conflict && conflict.id !== id)
            throw new Error("Already assigned");
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

    // Group-based assignment
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
    if (festival?.status === "EXPIRED") throw new Error("Festival expired");

    return prisma.$transaction(
      async (tx) => {
        const results = [];

        // Optimization: Group assignments by programmeId to minimize queries
        const assignmentsByProgramme = new Map<string, typeof assignments>();
        for (const a of assignments) {
          const existing = assignmentsByProgramme.get(a.programmeId) || [];
          existing.push(a);
          assignmentsByProgramme.set(a.programmeId, existing);
        }

        for (const [programmeId, progAssignments] of assignmentsByProgramme) {
          // 1. Verify Programme ONCE
          const programme = await tx.programme.findUnique({
            where: { id: programmeId },
            include: {
              category: true,
            },
          });

          if (!programme || programme.festivalId !== festivalId) {
            throw new Error(`Invalid Programme: ${programmeId}`);
          }

          const isGeneral = programme.category.type === "GENERAL";

          // 2. Fetch ALL students involved
          const studentIds = progAssignments.map((a) => a.studentId);
          const students = await tx.student.findMany({
            where: { id: { in: studentIds } },
          });
          const studentMap = new Map(students.map((s) => [s.id, s]));

          // 3. Pre-fetch existing assignments for related groups to check limits
          // We need assignments for any Group ID involved in this batch.
          const groupIds = new Set<string>();
          students.forEach((s) => {
            if (s.groupId) groupIds.add(s.groupId);
          });

          // Fetch existing assignments for these groups in this programme
          // Used for both Individual limit (maxParticipantsPerGroup) AND Group limits (maxTeams, maxStudentsPerTeam)
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

          // In-Memory Limit Tracking
          // We need to track counts dynamically as we add *new* assignments in this batch

          // Map<GroupId, count>
          const participantsPerGroup = new Map<string, number>();
          // Map<GroupId, Set<TeamNumber>>
          const teamsPerGroup = new Map<string, Set<number>>();
          // Map<GroupId_TeamNumber, count>
          const studentsPerTeam = new Map<string, number>();

          // Initialize with DB data
          existingAssignments.forEach((a) => {
            const gid = a.groupId || a.student?.groupId;
            if (!gid) return;

            // Participants Count
            participantsPerGroup.set(
              gid,
              (participantsPerGroup.get(gid) || 0) + 1,
            );

            // Distinct Teams
            const teams = teamsPerGroup.get(gid) || new Set();
            if (a.teamNumber) teams.add(a.teamNumber);
            teamsPerGroup.set(gid, teams);

            // Students per Team
            if (a.teamNumber) {
              const key = `${gid}_${a.teamNumber}`;
              studentsPerTeam.set(key, (studentsPerTeam.get(key) || 0) + 1);
            }
          });

          // Process Assignments
          for (const assignment of progAssignments) {
            const { studentId, teamNumber = 1 } = assignment;
            const student = studentMap.get(studentId);

            if (!student || student.festivalId !== festivalId) {
              throw new Error(`Invalid Student: ${studentId}`);
            }

            // Category Match
            if (!isGeneral && programme.categoryId !== student.categoryId) {
              throw new Error(`Category mismatch for student ${student.name}`);
            }

            const studentGroupId = student.groupId;

            if (studentGroupId) {
              if (programme.type === "GROUP") {
                // Check Max Teams
                if (programme.maxTeamsPerGroup) {
                  const currentTeams =
                    teamsPerGroup.get(studentGroupId) || new Set();
                  if (!currentTeams.has(teamNumber)) {
                    if (currentTeams.size >= programme.maxTeamsPerGroup) {
                      throw new Error(
                        `Max Teams per Group (${programme.maxTeamsPerGroup}) reached for this group.`,
                      );
                    }
                    // Tentatively add (will rollback if tx fails)
                    currentTeams.add(teamNumber);
                    teamsPerGroup.set(studentGroupId, currentTeams);
                  }
                }

                // Check Max Students Per Team
                if (programme.maxStudentsPerTeam) {
                  const key = `${studentGroupId}_${teamNumber}`;
                  const currentCount = studentsPerTeam.get(key) || 0;
                  if (currentCount >= programme.maxStudentsPerTeam) {
                    throw new Error(
                      `Max team size (${programme.maxStudentsPerTeam}) reached for Team ${teamNumber}`,
                    );
                  }
                  studentsPerTeam.set(key, currentCount + 1);
                }
              } else {
                // INDIVIDUAL
                if (programme.maxParticipantsPerGroup) {
                  const currentCount =
                    participantsPerGroup.get(studentGroupId) || 0;
                  if (currentCount >= programme.maxParticipantsPerGroup) {
                    throw new Error(
                      `Group limit (${programme.maxParticipantsPerGroup}) reached for ${programme.name}`,
                    );
                  }
                  participantsPerGroup.set(studentGroupId, currentCount + 1);
                }
              }
            }

            // Duplicate Check (Optimization: use a Set of processed IDs + check DB result?)
            // The DB array `existingAssignments` has studentIds.
            // Also need to check process cache for duplicates within the batch itself.
            // Checking `existingAssignments` is imperfect if we just adding, but strict duplicate check usually best done by unique constraint catch
            // or by checking the fetched list.
            if (existingAssignments.some((e) => e.studentId === studentId)) {
              throw new Error(
                `Student ${student.name} is already assigned to ${programme.name}`,
              );
            }

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

            // Add to 'existing' for subsequent checks in this loop if duplicate logic needs it
            existingAssignments.push({
              studentId,
              groupId: student.groupId || null,
              teamNumber,
              student: { groupId: student.groupId || null },
            } as any);
          }
        }

        return results;
      },
      {
        maxWait: 5000, // default
        timeout: 20000, // 20s
      },
    );
  },
};
