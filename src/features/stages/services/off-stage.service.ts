import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  stagePortalCredential as credentialTable,
  stage as stageTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { provisionStagePortalCredential } from "@/features/stage-portal/actions/stage-portal-credential.actions";

type DbOrTx = typeof db;

const OFF_STAGE_NAME = "Off-Stage";
const OFF_STAGE_DESCRIPTION =
  "Virtual stage for judging programmes without a scheduled time slot.";

type OffStageStage = {
  id: string;
  festivalId: string;
  name: string;
  isOffStage: boolean;
};

/**
 * Returns the off-stage stage row for the given festival, creating it (and
 * its portal credential) if absent. Also provisions a credential when an
 * existing stage row was inserted without one (e.g. via the migration
 * backfill that only creates stage rows).
 *
 * Idempotent: safe to call repeatedly and from concurrent code paths.
 * Backed by the partial unique index `stage_festivalId_isOffStage_key`.
 */
export async function ensureOffStageStage(
  festivalId: string,
  tx: DbOrTx = db,
): Promise<OffStageStage> {
  const existing = await tx.query.stage.findFirst({
    where: and(
      eq(stageTable.festivalId, festivalId),
      eq(stageTable.isOffStage, true),
    ),
    columns: { id: true, festivalId: true, name: true, isOffStage: true },
  });
  if (existing) {
    // Make sure the portal credential exists too — migration backfills
    // only insert the stage row.
    const credential = await tx.query.stagePortalCredential.findFirst({
      where: eq(credentialTable.stageId, existing.id),
      columns: { id: true },
    });
    if (!credential) {
      await provisionStagePortalCredential(
        { festivalId: existing.festivalId, stageId: existing.id },
        tx as any,
      );
    }
    return existing;
  }

  const now = serverNowIso();
  const id = randomUUID();

  // Insert the stage row. The partial unique index ensures at most one
  // off-stage per festival even under a race condition.
  await tx.insert(stageTable).values({
    id,
    festivalId,
    name: OFF_STAGE_NAME,
    description: OFF_STAGE_DESCRIPTION,
    createdByName: "System",
    createdByEmail: null,
    isOffStage: true,
    createdAt: now,
    updatedAt: now,
  } as any);

  // Provision the portal credential inside the same transaction so the
  // stage is usable immediately.
  await provisionStagePortalCredential({ festivalId, stageId: id }, tx as any);

  return {
    id,
    festivalId,
    name: OFF_STAGE_NAME,
    isOffStage: true,
  };
}

/** Look up the off-stage stage for a festival. Returns null if not provisioned. */
export async function getOffStageStage(
  festivalId: string,
  tx: DbOrTx = db,
): Promise<OffStageStage | null> {
  const row = await tx.query.stage.findFirst({
    where: and(
      eq(stageTable.festivalId, festivalId),
      eq(stageTable.isOffStage, true),
    ),
    columns: { id: true, festivalId: true, name: true, isOffStage: true },
  });
  return row ?? null;
}
