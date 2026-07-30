import { eq } from "drizzle-orm";
import * as schema from "../../src/core/database/schema";
import { FESTIVAL } from "./config";
import type { DB } from "./db";
import type { CreatedParticipant } from "./participants";
import type { CreatedStage } from "./taxonomies";

export type SeedSummary = {
  categories: number;
  groups: number;
  participants: number;
  leaders: number;
  judges: number;
  sessions: number;
  programmes: number;
};

export function printSeedSummary(
  summary: SeedSummary,
  participants: CreatedParticipant[],
  stages: CreatedStage[],
): void {
  const showcase = participants.filter((s) => s.isTeamLeader).slice(0, 4);

  console.log("\n✨ AHLUSSUFFA IGS PRO TIER FESTIVAL SUCCESSFULLY SEEDED!");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`Festival Name    : ${FESTIVAL.name}`);
  console.log(
    `Festival Dates   : ${FESTIVAL.startDate} to ${FESTIVAL.endDate}`,
  );
  console.log(`Tier             : ${FESTIVAL.tier}`);
  console.log("──────────────────────────────────────────────────────────");
  console.log(`Categories       : ${summary.categories}`);
  console.log(`Groups/Teams     : ${summary.groups}`);
  console.log(
    `Participants         : ${summary.participants} (${summary.leaders} Team Leaders)`,
  );
  console.log(`Judges           : ${summary.judges}`);
  console.log(`Sessions         : ${summary.sessions}`);
  console.log(`Programmes       : ${summary.programmes}`);
  console.log("──────────────────────────────────────────────────────────");
  console.log("STAGE JUDGE PORTAL ACCESS (share with judges at the venue):");
  for (const stage of stages) {
    console.log(
      `  • ${stage.name}  →  code ${stage.portalAccessCode}  ·  PIN ${stage.portalPin}`,
    );
  }
  console.log("──────────────────────────────────────────────────────────");
  console.log("PARTICIPANT LOGIN SHOWCASE (first leaders of each group):");
  for (const leader of showcase) {
    console.log(
      `  • Chest ${leader.chestNumber}  →  DOB ${leader.dateOfBirth.split("T")[0]}`,
    );
    console.log(
      `    Group: ${leader.groupId.slice(0, 8)}…   Email: ${leader.email}`,
    );
  }
  console.log("──────────────────────────────────────────────────────────");
}

export async function updateFestivalUsageCounts(
  db: DB,
  festivalId: string,
  counts: { participants: number; programmes: number; stages: number },
): Promise<void> {
  await db
    .update(schema.festival)
    .set({
      participantsCount: counts.participants,
      programmesCount: counts.programmes,
      stagesCount: counts.stages,
      storageUsedMb: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.festival.id, festivalId));
}
