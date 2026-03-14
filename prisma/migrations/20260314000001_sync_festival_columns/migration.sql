-- Sync festival table with schema: add any columns that may be missing (IF NOT EXISTS).
-- Safe to run multiple times; only missing columns are added.

ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "eventsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "stagesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "judgesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "storageUsedMB" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "institutionName" TEXT;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "institutionType" "InstitutionType";
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "programmeAssignmentDeadline" TIMESTAMP(3);
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "tier" "Tier" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "tierLabel" TEXT NOT NULL DEFAULT 'Standard';
