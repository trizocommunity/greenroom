-- CreateEnum
CREATE TYPE "ScheduleEntryType" AS ENUM ('PROGRAMME', 'SESSION');

-- AlterTable: add type (default PROGRAMME) and title
ALTER TABLE "schedule_entry" ADD COLUMN "type" "ScheduleEntryType" NOT NULL DEFAULT 'PROGRAMME';
ALTER TABLE "schedule_entry" ADD COLUMN "title" TEXT;

-- Backfill: rows with eventId (and no programmeId) become SESSION
UPDATE "schedule_entry"
SET "type" = 'SESSION'
WHERE "eventId" IS NOT NULL AND ("programmeId" IS NULL OR "programmeId" = '');

-- CreateIndex
CREATE INDEX "schedule_entry_festivalId_type_idx" ON "schedule_entry"("festivalId", "type");
