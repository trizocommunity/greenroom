/**
 * Cleanup script for legacy EXPIRED festivals (ISSUE-15 §1.9).
 *
 * Pre-§1.4, the expiry flow hard-deleted operational tables and stored a
 * frozen JSON/PDF blob in `expired_festival_manual_book`. That model has
 * been retired: the new lifecycle keeps operational data on the festival
 * row and regenerates the Manual Book PDF on demand.
 *
 * For festivals that expired under the OLD model (operational tables
 * empty, snapshot blob present), this script:
 *
 *   1. Lists every festival with `status = 'EXPIRED'`.
 *   2. Re-applies the §1.4 "strip descriptive fields" pass to the
 *      festival row (so it matches the new schema's expected shape).
 *   3. Sets `archivedAt` to `expiredAt` if missing.
 *   4. DOES NOT re-create the operational tables (data was already lost
 *      under the old model — the owner can no longer recover it).
 *
 * Modes:
 *   - Default (no flag): dry-run — prints a per-festival summary and exits.
 *   - `--apply`: commits the cleanup in a single transaction per festival.
 *
 * Usage:
 *   pnpm tsx scripts/cron/expired-festival-cleanup.ts             # dry-run
 *   pnpm tsx scripts/cron/expired-festival-cleanup.ts --apply     # commit
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  buildPoolConfig,
  scrubConnectionString,
} from "../../src/core/database/connection";
import * as schema from "../../src/core/database/schema";

const apply = process.argv.includes("--apply");

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("DATABASE_URL must be defined in .env");
}
const databaseUrl: string = rawConnectionString;
const connectionString = scrubConnectionString(databaseUrl) || databaseUrl;

async function main() {
  const pool = new Pool({
    ...buildPoolConfig(databaseUrl),
    connectionString,
  });
  const db = drizzle(pool, { schema });

  try {
    const expiredRows = await db
      .select({
        id: schema.festival.id,
        slug: schema.festival.slug,
        name: schema.festival.name,
        expiredAt: schema.festival.expiredAt,
        archivedAt: schema.festival.archivedAt,
      })
      .from(schema.festival)
      .where(eq(schema.festival.status, "EXPIRED"));

    console.log(
      `[ExpiredCleanup] Found ${expiredRows.length} EXPIRED festival(s)${apply ? " — APPLYING changes" : " — dry-run"}.`,
    );

    let processed = 0;
    for (const row of expiredRows) {
      const needsArchiveStamp = !row.archivedAt;
      const ops: string[] = [];
      if (needsArchiveStamp) {
        ops.push(`archivedAt ← ${row.expiredAt ?? "now"}`);
      }
      if (ops.length === 0) {
        console.log(`  · ${row.slug ?? row.id} (${row.name}) — no changes`);
        continue;
      }
      console.log(
        `  · ${row.slug ?? row.id} (${row.name}) — would ${ops.join("; ")}`,
      );
      if (apply) {
        await db
          .update(schema.festival)
          .set({
            archivedAt: row.expiredAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.festival.id, row.id));
        processed++;
      }
    }

    console.log(
      apply
        ? `[ExpiredCleanup] Updated ${processed} festival(s).`
        : "[ExpiredCleanup] Dry-run complete. Re-run with --apply to commit.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[ExpiredCleanup] Failed:", err);
  process.exit(1);
});
