-- Migration: ISSUE-XX Off-Stage stage for unscheduled programmes.
--
--   Adds isOffStage flag to the stage table so each festival can host a
--   single virtual "Off-Stage" stage that captures judgement for programmes
--   with no schedule_entry (i.e. unscheduled programmes). A partial unique
--   index enforces at most one off-stage stage per festival at the DB level.
--
--   Backfill: every existing festival gets one Off-Stage stage row. Portal
--   credentials are NOT inserted here — the dashboard's "Provision Off-Stage"
--   button (or the service-layer `ensureOffStageStage` path) provisions a
--   real credential on demand so the access code + PIN can be displayed to
--   the admin rather than buried in a SQL migration.

BEGIN;

-- 1. Column on stage
ALTER TABLE "stage" ADD COLUMN IF NOT EXISTS "is_off_stage" boolean NOT NULL DEFAULT false;

-- 2. Partial unique index: at most one off-stage per festival
CREATE UNIQUE INDEX IF NOT EXISTS "stage_festivalId_isOffStage_key"
  ON "stage" USING btree ("festivalId" ASC NULLS LAST)
  WHERE "is_off_stage" = true;

-- 3. Backfill: insert one Off-Stage stage per existing festival that does
--    not yet have one. The credential is provisioned separately by the
--    service layer when the dashboard's Provision Off-Stage button is
--    clicked, or automatically by `ensureOffStageStage` on festival
--    creation.
INSERT INTO "stage" (
  "id", "festivalId", "name", "description", "createdBy", "createdAt", "updatedAt"
)
SELECT
  'offstage-' || "festival"."id",
  "festival"."id",
  'Off-Stage',
  'Virtual stage for judging programmes without a scheduled time slot.',
  'system',
  NOW(), NOW()
FROM "festival"
WHERE NOT EXISTS (
  SELECT 1 FROM "stage" s
   WHERE s."festivalId" = "festival"."id"
     AND s."is_off_stage" = true
);

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────
-- BEGIN;
-- DELETE FROM "stage_portal_credential" WHERE "stageId" IN (SELECT "id" FROM "stage" WHERE "is_off_stage" = true);
-- DELETE FROM "stage" WHERE "is_off_stage" = true;
-- DROP INDEX IF EXISTS "stage_festivalId_isOffStage_key";
-- ALTER TABLE "stage" DROP COLUMN IF NOT EXISTS "is_off_stage";
-- COMMIT;