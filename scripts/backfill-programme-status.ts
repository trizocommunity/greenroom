/**
 * Backfill programme.status to honour the corrected DRAFT → ASSIGNED → SCHEDULED
 * lifecycle from `computePreWorksStatus`.
 *
 * Why: the previous branch order promoted any STANDARD/PRO programme with a
 * schedule entry straight to SCHEDULED, even when no participants had been
 * assigned. Programmes migrated before the fix can be stuck in SCHEDULED
 * without ever being fully assigned.
 *
 * What it does:
 *   For every programme row, captures the current status, calls
 *   `updateProgrammeStatus(id)`, and logs the (id, oldStatus, newStatus) diff.
 *   Idempotent — re-running on a clean database produces zero changes.
 *
 * Usage: `npx tsx scripts/backfill-programme-status.ts`
 *   (run with DATABASE_URL pointing at the target database first)
 */

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { programme as programmeTable } from "@/core/database/schema";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

async function main() {
  console.log("[backfill:programme-status] starting");
  const programmes = await db
    .select({ id: programmeTable.id, status: programmeTable.status })
    .from(programmeTable);

  let changed = 0;
  const diffs: Array<{ id: string; from: string; to: string }> = [];

  for (const p of programmes) {
    const next = await updateProgrammeStatus(p.id);
    if (next !== p.status) {
      changed += 1;
      diffs.push({ id: p.id, from: p.status, to: next });
    }
  }

  console.log(
    `[backfill:programme-status] processed ${programmes.length} programmes, ${changed} status changes`,
  );
  if (diffs.length > 0) {
    console.log("[backfill:programme-status] changes:");
    for (const d of diffs) {
      console.log(`  ${d.id}: ${d.from} → ${d.to}`);
    }
  }
  console.log("[backfill:programme-status] done");
}

main().catch((err) => {
  console.error("[backfill:programme-status] failed", err);
  process.exitCode = 1;
});
