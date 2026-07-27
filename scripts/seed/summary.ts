import { eq } from "drizzle-orm";
import * as schema from "../../src/core/database/schema";
import { FESTIVAL } from "./config";
import type { DB } from "./db";
import type { CreatedStudent } from "./students";

export type SeedSummary = {
  categories: number;
  groups: number;
  students: number;
  leaders: number;
  judges: number;
  sessions: number;
  programmes: number;
  assignments: number;
};

export function printSeedSummary(
  summary: SeedSummary,
  students: CreatedStudent[],
): void {
  const showcase = students.filter((s) => s.isTeamLeader).slice(0, 4);

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
    `Students         : ${summary.students} (${summary.leaders} Team Leaders)`,
  );
  console.log(`Judges           : ${summary.judges}`);
  console.log(`Sessions         : ${summary.sessions}`);
  console.log(`Programmes       : ${summary.programmes}`);
  console.log(`Assignments      : ${summary.assignments}`);
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
  counts: { students: number; programmes: number; stages: number },
): Promise<void> {
  await db
    .update(schema.festival)
    .set({
      studentsCount: counts.students,
      programmesCount: counts.programmes,
      stagesCount: counts.stages,
      storageUsedMb: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.festival.id, festivalId));
}
