-- Migration: Drop student.age and make student.dateOfBirth NOT NULL.
--
-- Rationale: age is now derived from dateOfBirth at read time so the two
-- cannot drift out of sync. Existing rows that lack a dateOfBirth get a
-- sentinel value (1970-01-01) so the NOT NULL constraint can be enforced
-- without losing rows; admins can fix the date afterwards. The age column
-- is dropped entirely to remove the dual-source-of-truth.
--
-- Note: the sentinel backfill is intentionally ugly — any real DB with
-- row(s) lacking DOB needs operator attention. Adjust as needed before
-- running in production.

UPDATE "student"
SET "dateOfBirth" = '1970-01-01 00:00:00.000+00'
WHERE "dateOfBirth" IS NULL;

ALTER TABLE "student"
  ALTER COLUMN "dateOfBirth" SET NOT NULL;

ALTER TABLE "student"
  DROP COLUMN IF EXISTS "age";
