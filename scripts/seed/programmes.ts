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
};

export async function createProgrammesAndAssignments(
  db: DB,
  festivalId: string,
  categories: CreatedCategory[],
  stages: CreatedStage[],
  groups: CreatedGroup[],
  students: CreatedStudent[],
): Promise<ProgrammeResult> {
  console.log("🏆 Creating Programmes...");

  let programmeCount = 0;

  for (const cat of categories) {
    for (const tmpl of PROGRAMME_TEMPLATES) {
      const progId = generateId();
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
        status: "READY",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      programmeCount++;
    }
  }

  return { programmeCount };
}
