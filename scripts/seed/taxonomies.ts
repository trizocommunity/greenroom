import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import {
  generateAccessCode,
  generatePin,
  hashPin,
} from "../../src/features/stage-portal/services/pin";
import { CATEGORIES, GROUPS, STAGES } from "./config";
import type { DB } from "./db";

export type CreatedCategory = { id: string; name: string; type: string };
export type CreatedGroup = { id: string; name: string; start: number };
export type CreatedStage = {
  id: string;
  name: string;
  portalAccessCode: string;
  portalPin: string;
};

export async function createCategories(
  db: DB,
  festivalId: string,
): Promise<CreatedCategory[]> {
  console.log("📁 Creating Categories (GENERAL, JUNIOR, SENIOR)...");
  const out: CreatedCategory[] = [];
  for (const cat of CATEGORIES) {
    const id = generateId();
    await db.insert(schema.category).values({
      id,
      festivalId,
      name: cat.name,
      description: cat.description,
      type: cat.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    out.push({ id, name: cat.name, type: cat.type });
  }
  return out;
}

export async function createGroups(
  db: DB,
  festivalId: string,
): Promise<CreatedGroup[]> {
  console.log("🚩 Creating 2 Groups (Al-Qurtuba & Al-Andalus)...");
  const out: CreatedGroup[] = [];
  for (const group of GROUPS) {
    const id = generateId();
    await db.insert(schema.group).values({
      id,
      festivalId,
      name: group.name,
      color: group.color,
      seriesStart: group.start,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    out.push({ id, name: group.name, start: group.start });
  }
  return out;
}

export async function createStages(
  db: DB,
  festivalId: string,
): Promise<CreatedStage[]> {
  console.log("🎭 Creating Stages (+ judge portal credentials)...");
  const out: CreatedStage[] = [];
  for (const stage of STAGES) {
    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(schema.stage).values({
      id,
      festivalId,
      name: stage.name,
      description: stage.description,
      createdAt: now,
      updatedAt: now,
    });

    const portalAccessCode = generateAccessCode();
    const portalPin = generatePin();
    await db.insert(schema.stagePortalCredential).values({
      id: generateId(),
      festivalId,
      stageId: id,
      accessCode: portalAccessCode,
      pinHash: await hashPin(portalPin),
      attempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });

    out.push({ id, name: stage.name, portalAccessCode, portalPin });
  }
  return out;
}

export async function createJudges(
  db: DB,
  festivalId: string,
  judges: string[],
): Promise<void> {
  console.log(`⚖️  Creating ${judges.length} Judges...`);
  for (const name of judges) {
    await db.insert(schema.judge).values({
      id: generateId(),
      festivalId,
      name,
      description: "Appointed Panel Judge",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
