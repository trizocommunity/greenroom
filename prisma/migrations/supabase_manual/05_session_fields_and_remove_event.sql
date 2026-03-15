-- Session fields on schedule_entry and remove Event model.
-- Run after 04_remove_schedule_entry_event_id.sql if not using Prisma migrate deploy.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionType') THEN
    CREATE TYPE "SessionType" AS ENUM ('GENERAL', 'CEREMONY', 'TALK', 'CONCERT');
  END IF;
END$$;

ALTER TABLE "schedule_entry"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "speakers" TEXT,
  ADD COLUMN IF NOT EXISTS "sessionType" "SessionType";

DROP TABLE IF EXISTS "event";
DROP TYPE IF EXISTS "EventType";

ALTER TABLE "festival" DROP COLUMN IF EXISTS "eventsCount";
