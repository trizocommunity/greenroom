-- Migration: ISSUE-16 Slice 1 — Allow unscheduled programmes to report.
--
--   programme_reporting_session.scheduleEntryId becomes nullable so that a
--   programme with assignments but no schedule entry can still get a reporting
--   session. The old UNIQUE index on scheduleEntryId is dropped in favour of
--   a UNIQUE index on (festivalId, programmeId) so each programme has at most
--   one open reporting session per festival.

BEGIN;

ALTER TABLE "programme_reporting_session" ALTER COLUMN "scheduleEntryId" DROP NOT NULL;

DROP INDEX IF EXISTS "programme_reporting_session_scheduleEntryId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "programme_reporting_session_festivalId_programmeId_key"
  ON "programme_reporting_session" USING btree ("festivalId" ASC NULLS LAST, "programmeId" ASC NULLS LAST);

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────
-- BEGIN;
-- DROP INDEX IF EXISTS "programme_reporting_session_festivalId_programmeId_key";
-- CREATE UNIQUE INDEX "programme_reporting_session_scheduleEntryId_key"
--   ON "programme_reporting_session" ("scheduleEntryId");
-- ALTER TABLE "programme_reporting_session" ALTER COLUMN "scheduleEntryId" SET NOT NULL;
-- COMMIT;
