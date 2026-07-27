import "dotenv/config";
import { JUDGES, SESSIONS } from "./seed/config";
import { buildDb } from "./seed/db";
import {
  addFestivalMembers,
  createFestival,
  recordProPayment,
  upsertPurchaseSummary,
} from "./seed/festival";
import {
  createProgrammesAndAssignments,
  createSessions,
} from "./seed/programmes";
import { createStudents } from "./seed/students";
import { printSeedSummary, updateFestivalUsageCounts } from "./seed/summary";
import {
  createCategories,
  createGroups,
  createJudges,
  createStages,
} from "./seed/taxonomies";
import { createFestivalOwner, createSuperAdmin } from "./seed/users";

async function seed() {
  console.log("🌱 Starting database seeding...");
  const { db, pool } = buildDb();

  await createSuperAdmin(db);

  const { ownerId, institutionId } = await createFestivalOwner(db);

  const festivalId = await createFestival(db, ownerId, institutionId);
  await recordProPayment(db, festivalId, ownerId);
  await upsertPurchaseSummary(db, ownerId, festivalId);
  await addFestivalMembers(db, festivalId, ownerId);

  const categories = await createCategories(db, festivalId);
  const groups = await createGroups(db, festivalId);
  const stages = await createStages(db, festivalId);
  await createJudges(db, festivalId, JUDGES);

  const students = await createStudents(db, festivalId, categories, groups);

  const sessionCount = await createSessions(db, festivalId, stages, SESSIONS);

  const { programmeCount, assignmentCount } =
    await createProgrammesAndAssignments(
      db,
      festivalId,
      categories,
      stages,
      groups,
      students,
    );

  await updateFestivalUsageCounts(db, festivalId, {
    students: students.length,
    programmes: programmeCount,
    stages: stages.length,
  });

  printSeedSummary(
    {
      categories: categories.length,
      groups: groups.length,
      students: students.length,
      leaders: students.filter((s) => s.isTeamLeader).length,
      judges: JUDGES.length,
      sessions: sessionCount,
      programmes: programmeCount,
      assignments: assignmentCount,
    },
    students,
  );

  await pool.end();
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
