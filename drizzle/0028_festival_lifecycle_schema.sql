-- Migration: ISSUE-15 §1.2 — Festival Lifecycle schema additions.
--
--   1. Add festival.archivedAt (set on expiry alongside expiredAt).
--   2. Add the EXPIRATION_WARNING enum value used by the T-7 in-app banner
--      notification cycle (idempotency anchor in festival_lifecycle_event).
--   3. Replace the strict festival_ownerId_key UNIQUE index with a partial
--      UNIQUE index that only enforces uniqueness for active festivals.
--      Owners can hold any number of EXPIRED history rows but at most one
--      non-EXPIRED row — this unlocks the §1.10 Relaunch flow.

BEGIN;

-- ─── 1. Add festival.archivedAt column + btree index ──────────────────────
ALTER TABLE "festival" ADD COLUMN "archivedAt" TIMESTAMPTZ(3);
CREATE INDEX "festival_archivedAt_idx" ON "festival" USING btree ("archivedAt" ASC NULLS LAST);

-- ─── 2. Extend FestivalLifecycleEventType enum with EXPIRATION_WARNING ─────
ALTER TYPE "FestivalLifecycleEventType" ADD VALUE IF NOT EXISTS 'EXPIRATION_WARNING';

-- ─── 3. Partial unique index for ownerId — only enforce for non-EXPIRED ────
ALTER TABLE "festival" DROP CONSTRAINT IF EXISTS "festival_ownerId_key";
DROP INDEX IF EXISTS "festival_ownerId_key";
CREATE UNIQUE INDEX "festival_ownerId_active_key"
  ON "festival" ("ownerId")
  WHERE "status" <> 'EXPIRED';

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────────
-- BEGIN;
-- DROP INDEX IF EXISTS "festival_ownerId_active_key";
-- CREATE UNIQUE INDEX "festival_ownerId_key"
--   ON "festival" ("ownerId" ASC NULLS LAST);
-- ALTER TABLE "festival" DROP COLUMN IF EXISTS "archivedAt";
-- DROP INDEX IF EXISTS "festival_archivedAt_idx";
-- -- Postgres cannot remove an enum value once added. Restore by recreating
-- -- the type without EXPIRATION_WARNING if absolutely necessary.
-- COMMIT;
