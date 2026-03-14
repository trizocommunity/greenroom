-- Create ScoringSystem enum if not exists (used by festival.scoringSystem)
DO $$ BEGIN
  CREATE TYPE "ScoringSystem" AS ENUM ('POSITION_BASED', 'SCORE_BASED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add any remaining festival columns that may be missing (safe to run multiple times)
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "programmesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "studentsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "studentCreationDeadline" TIMESTAMP(3);
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "chestNumberSettings" JSONB;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "teamStandings" JSONB;

-- scoringSystem column (requires enum); add only if column missing
DO $$ BEGIN
  ALTER TABLE "festival" ADD COLUMN "scoringSystem" "ScoringSystem" NOT NULL DEFAULT 'SCORE_BASED';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
