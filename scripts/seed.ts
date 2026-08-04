import "dotenv/config";
import { JUDGES, SESSIONS } from "./seed/config";
import { buildDb } from "./seed/db";
import {
  addFestivalMembers,
  createFestival,
  recordProPayment,
  upsertPurchaseSummary,
} from "./seed/festival";
import { createParticipants } from "./seed/participants";
import {
  createProgrammes,
  createSessions,
} from "./seed/programmes";
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

  const participants = await createParticipants(
    db,
    festivalId,
    categories,
    groups,
  );

  const sessionCount = await createSessions(db, festivalId, stages, SESSIONS);

  const { programmeCount } = await createProgrammes(
    db,
    festivalId,
    categories,
    stages,
  );

  await updateFestivalUsageCounts(db, festivalId, {
    participants: participants.length,
    programmes: programmeCount,
    stages: stages.length,
  });

  printSeedSummary(
    {
      categories: categories.length,
      groups: groups.length,
      participants: participants.length,
      leaders: participants.filter((s) => s.isTeamLeader).length,
      judges: JUDGES.length,
      sessions: sessionCount,
      programmes: programmeCount,
    },
    participants,
    stages,
  );

  await pool.end();
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
