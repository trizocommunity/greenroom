-- Remove event link from schedule_entry (sessions use title only).
-- Run after 03_schedule_entry_type_and_title.sql if not using Prisma migrate deploy.

ALTER TABLE "schedule_entry" DROP CONSTRAINT IF EXISTS "schedule_entry_eventId_fkey";
ALTER TABLE "schedule_entry" DROP COLUMN IF EXISTS "eventId";
