-- Session fields on schedule_entry and remove Event model
-- 1. Create SessionType enum
CREATE TYPE "SessionType" AS ENUM ('GENERAL', 'CEREMONY', 'TALK', 'CONCERT');

-- 2. Add session fields to schedule_entry
ALTER TABLE "schedule_entry" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "schedule_entry" ADD COLUMN IF NOT EXISTS "speakers" TEXT;
ALTER TABLE "schedule_entry" ADD COLUMN IF NOT EXISTS "sessionType" "SessionType";

-- 3. Drop event table and EventType enum
DROP TABLE IF EXISTS "event";
DROP TYPE IF EXISTS "EventType";

-- 4. Drop eventsCount from festival
ALTER TABLE "festival" DROP COLUMN IF EXISTS "eventsCount";
