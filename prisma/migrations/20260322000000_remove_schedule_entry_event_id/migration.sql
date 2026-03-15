-- DropForeignKey
ALTER TABLE "schedule_entry" DROP CONSTRAINT IF EXISTS "schedule_entry_eventId_fkey";

-- DropColumn
ALTER TABLE "schedule_entry" DROP COLUMN IF EXISTS "eventId";
