-- Results Console: collapse publish/announce into single publish,
-- add result numbers, remove block counter & display mode toggle.

-- 1. Add result_number to programme
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "result_number" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "programme_festivalId_resultNumber_key"
  ON "programme" ("festivalId", "result_number")
  WHERE "result_number" IS NOT NULL;

-- 2. Collapse result flags: isPublished = isAnnounced (the real public gate)
UPDATE "result" SET "isPublished" = "isAnnounced"
  WHERE "isPublished" <> "isAnnounced";

ALTER TABLE "result" DROP COLUMN IF EXISTS "isAnnounced";
ALTER TABLE "result" DROP COLUMN IF EXISTS "announcedAt";
ALTER TABLE "result" DROP COLUMN IF EXISTS "announced_by_email";
ALTER TABLE "result" DROP COLUMN IF EXISTS "announced_by_name";

-- 3. Festival: drop block counter & display mode, add standings tracking
ALTER TABLE "festival" DROP COLUMN IF EXISTS "publicDisplayMode";
ALTER TABLE "festival" DROP COLUMN IF EXISTS "announcerResultsPerStandings";
ALTER TABLE "festival" DROP COLUMN IF EXISTS "announcedProgrammesSinceStandings";

ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "standings_published_at_result_number" integer;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "standings_published_at" timestamptz;

-- 4. Backfill programme status
UPDATE "programme" SET "status" = 'PUBLISHED' WHERE "status" = 'ANNOUNCED';

UPDATE "programme" SET "status" = 'JUDGED'
  WHERE "status" = 'PUBLISHED'
    AND NOT EXISTS (
      SELECT 1 FROM "result" r
       WHERE r."programmeId" = "programme"."id" AND r."isPublished" = true
    );
