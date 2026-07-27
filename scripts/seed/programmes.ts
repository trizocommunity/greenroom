import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import { PROGRAMME_SCHEDULE, PROGRAMME_TEMPLATES } from "./config";
import type { DB } from "./db";
import type { CreatedStudent } from "./students";
import type { CreatedCategory, CreatedGroup, CreatedStage } from "./taxonomies";

export async function createSessions(
  db: DB,
  festivalId: string,
  stages: CreatedStage[],
  sessions: {
    title: string;
    sessionType: string;
    description: string;
    startTime: string;
    endTime: string;
    stageIdx: number;
  }[],
): Promise<number> {
  console.log(`📅 Creating & Scheduling ${sessions.length} Sessions...`);
  let order = 1;
  for (const sess of sessions) {
    const stageAssigned = stages[sess.stageIdx] ?? stages[0];
    await db.insert(schema.scheduleEntry).values({
      id: generateId(),
      festivalId,
      title: sess.title,
      description: sess.description,
      type: "SESSION",
      sessionType: sess.sessionType as any,
      startTime: sess.startTime,
      endTime: sess.endTime,
      order: order++,
      stageId: stageAssigned?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return sessions.length;
}

export type ProgrammeResult = {
  programmeCount: number;
  assignmentCount: number;
};

export async function createProgrammesAndAssignments(
  db: DB,
  festivalId: string,
  categories: CreatedCategory[],
  stages: CreatedStage[],
  groups: CreatedGroup[],
  students: CreatedStudent[],
): Promise<ProgrammeResult> {
  console.log(
    "🏆 Creating Programmes, 100% Student Assignments, & Scheduling every Programme...",
  );

  let assignmentCount = 0;
  let programmeCount = 0;
  let order = 1;

  for (const cat of categories) {
    for (const tmpl of PROGRAMME_TEMPLATES) {
      const progId = generateId();
      const scheduleKey = `${tmpl.name} - ${cat.name}`;
      const scheduleSlot = PROGRAMME_SCHEDULE[scheduleKey] ?? {
        startTime: "2026-08-15T11:00:00.000Z",
        endTime: "2026-08-15T12:00:00.000Z",
        stageIdx: 0,
      };
      const stageAssigned = stages[scheduleSlot.stageIdx] ?? stages[0];

      await db.insert(schema.programme).values({
        id: progId,
        festivalId,
        categoryId: cat.id,
        name: tmpl.name,
        type: tmpl.type,
        stageType: tmpl.stageType,
        maxParticipantsPerGroup: tmpl.maxParticipantsPerGroup,
        maxTeamsPerGroup: tmpl.maxTeamsPerGroup,
        maxStudentsPerTeam: tmpl.maxStudentsPerTeam,
        status: "SCHEDULED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const scheduleEntryId = generateId();
      await db.insert(schema.scheduleEntry).values({
        id: scheduleEntryId,
        festivalId,
        programmeId: progId,
        stageId: stageAssigned?.id,
        title: tmpl.name,
        type: "PROGRAMME",
        startTime: scheduleSlot.startTime,
        endTime: scheduleSlot.endTime,
        order: order++,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(schema.programmeReportingSession).values({
        id: generateId(),
        festivalId,
        scheduleEntryId,
        programmeId: progId,
        stageId: stageAssigned?.id,
        status: "NOT_STARTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      programmeCount++;

      const categoryStudents =
        cat.type === "GENERAL"
          ? students
          : students.filter((s) => s.categoryId === cat.id);

      if (tmpl.type === "INDIVIDUAL") {
        for (const group of groups) {
          const groupStudents = categoryStudents.filter(
            (s) => s.groupId === group.id,
          );
          for (const student of groupStudents.slice(
            0,
            tmpl.maxParticipantsPerGroup,
          )) {
            await db.insert(schema.programmeAssignment).values({
              id: generateId(),
              programmeId: progId,
              festivalId,
              categoryId: cat.id,
              studentId: student.id,
              groupId: group.id,
              teamNumber: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            assignmentCount++;
          }
        }
      } else {
        for (const group of groups) {
          const groupStudents = categoryStudents.filter(
            (s) => s.groupId === group.id,
          );
          for (let teamNum = 1; teamNum <= tmpl.maxTeamsPerGroup; teamNum++) {
            const startIdx = (teamNum - 1) * tmpl.maxStudentsPerTeam;
            const teamMembers = groupStudents.slice(
              startIdx,
              startIdx + tmpl.maxStudentsPerTeam,
            );
            for (const student of teamMembers) {
              await db.insert(schema.programmeAssignment).values({
                id: generateId(),
                programmeId: progId,
                festivalId,
                categoryId: cat.id,
                studentId: student.id,
                groupId: group.id,
                teamNumber: teamNum,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              assignmentCount++;
            }
            // Pick the first team member as the programme team lead (seed default).
            const teamLead = teamMembers[0];
            if (teamLead) {
              await db.insert(schema.programmeTeamLead).values({
                id: generateId(),
                programmeId: progId,
                groupId: group.id,
                teamNumber: teamNum,
                studentId: teamLead.id,
                appointedBy: "seed",
                appointedByRole: "ADMIN",
                appointedByName: "Seed",
                appointedByEmail: "seed@local",
                appointedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  }

  return { programmeCount, assignmentCount };
}
