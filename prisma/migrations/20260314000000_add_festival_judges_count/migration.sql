-- Add judgesCount to festival if missing (schema/db sync)
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "judgesCount" INTEGER NOT NULL DEFAULT 0;
