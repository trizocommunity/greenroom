-- Schedule entry type (programme vs session) and title
-- Run once in Supabase SQL Editor if not using Prisma migrate deploy.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduleEntryType') THEN
    CREATE TYPE "ScheduleEntryType" AS ENUM ('PROGRAMME', 'SESSION');
  END IF;
END$$;

ALTER TABLE "schedule_entry"
  ADD COLUMN IF NOT EXISTS "type" "ScheduleEntryType" NOT NULL DEFAULT 'PROGRAMME',
  ADD COLUMN IF NOT EXISTS "title" TEXT;

UPDATE "schedule_entry"
SET "type" = 'SESSION'
WHERE "eventId" IS NOT NULL AND ("programmeId" IS NULL OR "programmeId" = '');

CREATE INDEX IF NOT EXISTS "schedule_entry_festivalId_type_idx"
  ON "schedule_entry"("festivalId", "type");
