-- Migration: Drop participant.age and make participant.dateOfBirth NOT NULL.
--
-- Rationale: age is now derived from dateOfBirth at read time so the two
-- cannot drift out of sync. Existing rows that lack a dateOfBirth get a
-- sentinel value (1970-01-01) so the NOT NULL constraint can be enforced
-- without losing rows; admins can fix the date afterwards. The age column
-- is dropped entirely to remove the dual-source-of-truth.
--
-- Note: the sentinel backfill is intentionally ugly â€” any real DB with
-- row(s) lacking DOB needs operator attention. Adjust as needed before
-- running in production.

UPDATE "participant"
SET "dateOfBirth" = '1970-01-01 00:00:00.000+00'
WHERE "dateOfBirth" IS NULL;

ALTER TABLE "participant"
  ALTER COLUMN "dateOfBirth" SET NOT NULL;

ALTER TABLE "participant"
  DROP COLUMN IF EXISTS "age";
