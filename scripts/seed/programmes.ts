import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import {
  FESTIVAL_OWNER_EMAIL,
  FESTIVAL_OWNER_NAME,
  PROGRAMMES_BY_CATEGORY,
} from "./config";
import type { DB } from "./db";
import type { CreatedCategory, CreatedStage } from "./taxonomies";

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

export async function createProgrammes(
  db: DB,
  festivalId: string,
  categories: CreatedCategory[],
  _stages: CreatedStage[],
): Promise<ProgrammeResult> {
  console.log("🏆 Creating Programmes…");

  let programmeCount = 0;
  const nowIso = new Date().toISOString();

  for (const cat of categories) {
    const templates = PROGRAMMES_BY_CATEGORY[cat.name];
    if (!templates?.length) {
      throw new Error(`No programme seed data configured for category ${cat.name}`);
    }

    for (const tmpl of templates) {
      await db.insert(schema.programme).values({
        id: generateId(),
        festivalId,
        categoryId: cat.id,
        name: tmpl.name,
        type: tmpl.type,
        stageType: tmpl.stageType === "stage" ? "STAGE" : "NON_STAGE",
        maxParticipantsPerGroup: tmpl.maxParticipantsPerGroup,
        maxTeamsPerGroup: tmpl.maxTeamsPerGroup,
        maxParticipantsPerTeam: tmpl.maxParticipantsPerTeam,
        durationMode: "SEQUENTIAL",
        timePerUnitMinutes: tmpl.timePerUnitMinutes,
        status: "DRAFT",
        createdByEmail: FESTIVAL_OWNER_EMAIL,
        createdByName: FESTIVAL_OWNER_NAME,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      programmeCount++;
    }
  }

  return { programmeCount };
}
