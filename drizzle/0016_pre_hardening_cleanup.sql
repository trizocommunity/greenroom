-- Pre-hardening data cleanup for 0004_schema_hardening.sql
-- Goal: make existing data compatible with new unique/check constraints.
-- Safe-by-default approach:
-- 1) Snapshot invalid rows to backup tables
-- 2) Deterministically fix what can be fixed
-- 3) Quarantine + remove rows that cannot be repaired unambiguously

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Backup/quarantine tables (idempotent)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "_backup_invalid_programme_notification"
AS SELECT * FROM "programme_notification" WHERE false;

CREATE TABLE IF NOT EXISTS "_backup_invalid_programme_assignment"
AS SELECT * FROM "programme_assignment" WHERE false;

-- -----------------------------------------------------------------------------
-- 1) De-duplicate scoped names for unique indexes:
--    - category(festivalId, name)
--    - group(festivalId, name)
--    - stage(festivalId, name)
--
-- Keep first row as-is, suffix others with " (#N)" using a stable order by id.
-- -----------------------------------------------------------------------------

WITH ranked AS (
  SELECT
    "id",
    "festivalId",
    "name",
    ROW_NUMBER() OVER (PARTITION BY "festivalId", "name" ORDER BY "id") AS rn
  FROM "category"
)
UPDATE "category" c
SET "name" = CONCAT(c."name", ' (#', ranked.rn::text, ')')
FROM ranked
WHERE c."id" = ranked."id"
  AND ranked.rn > 1;

WITH ranked AS (
  SELECT
    "id",
    "festivalId",
    "name",
    ROW_NUMBER() OVER (PARTITION BY "festivalId", "name" ORDER BY "id") AS rn
  FROM "group"
)
UPDATE "group" g
SET "name" = CONCAT(g."name", ' (#', ranked.rn::text, ')')
FROM ranked
WHERE g."id" = ranked."id"
  AND ranked.rn > 1;

WITH ranked AS (
  SELECT
    "id",
    "festivalId",
    "name",
    ROW_NUMBER() OVER (PARTITION BY "festivalId", "name" ORDER BY "id") AS rn
  FROM "stage"
)
UPDATE "stage" s
SET "name" = CONCAT(s."name", ' (#', ranked.rn::text, ')')
FROM ranked
WHERE s."id" = ranked."id"
  AND ranked.rn > 1;

-- -----------------------------------------------------------------------------
-- 2) programme_notification recipient integrity:
--    New rule: exactly one recipient must be set.
--
-- Fix strategy:
--    - both set: keep recipientUserId, null recipientStudentId
--    - both null: backup + delete (cannot infer recipient safely)
-- -----------------------------------------------------------------------------

UPDATE "programme_notification"
SET "recipientStudentId" = NULL
WHERE "recipientUserId" IS NOT NULL
  AND "recipientStudentId" IS NOT NULL;

INSERT INTO "_backup_invalid_programme_notification"
SELECT pn.*
FROM "programme_notification" pn
LEFT JOIN "_backup_invalid_programme_notification" b
  ON b."id" = pn."id"
WHERE pn."recipientUserId" IS NULL
  AND pn."recipientStudentId" IS NULL
  AND b."id" IS NULL;

DELETE FROM "programme_notification"
WHERE "recipientUserId" IS NULL
  AND "recipientStudentId" IS NULL;

-- -----------------------------------------------------------------------------
-- 3) programme_assignment target integrity:
--    New rule: at least one of (studentId, groupId) must be present.
--
-- Fix strategy:
--    - If studentId exists and groupId null, backfill groupId from student.groupId
--    - If both still null, backup + delete (unrecoverable without business context)
-- -----------------------------------------------------------------------------

UPDATE "programme_assignment" pa
SET "groupId" = s."groupId"
FROM "student" s
WHERE pa."studentId" = s."id"
  AND pa."groupId" IS NULL;

INSERT INTO "_backup_invalid_programme_assignment"
SELECT pa.*
FROM "programme_assignment" pa
LEFT JOIN "_backup_invalid_programme_assignment" b
  ON b."id" = pa."id"
WHERE pa."studentId" IS NULL
  AND pa."groupId" IS NULL
  AND b."id" IS NULL;

DELETE FROM "programme_assignment"
WHERE "studentId" IS NULL
  AND "groupId" IS NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- Post-check queries (run manually after migration)
-- -----------------------------------------------------------------------------
-- SELECT "festivalId", "name", COUNT(*) FROM "category" GROUP BY 1,2 HAVING COUNT(*) > 1;
-- SELECT "festivalId", "name", COUNT(*) FROM "group" GROUP BY 1,2 HAVING COUNT(*) > 1;
-- SELECT "festivalId", "name", COUNT(*) FROM "stage" GROUP BY 1,2 HAVING COUNT(*) > 1;
-- SELECT COUNT(*) FROM "programme_notification" WHERE "recipientUserId" IS NULL AND "recipientStudentId" IS NULL;
-- SELECT COUNT(*) FROM "programme_notification" WHERE "recipientUserId" IS NOT NULL AND "recipientStudentId" IS NOT NULL;
-- SELECT COUNT(*) FROM "programme_assignment" WHERE "studentId" IS NULL AND "groupId" IS NULL;

