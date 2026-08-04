-- Add DurationMode enum
DO $$ BEGIN
  CREATE TYPE "DurationMode" AS ENUM ('SEQUENTIAL', 'PARALLEL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add bilingual name and duration fields to programme
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "name_secondary" text;
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "duration_mode" "DurationMode" NOT NULL DEFAULT 'SEQUENTIAL';
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "time_per_unit_minutes" integer NOT NULL DEFAULT 5;
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "parallel_duration_minutes" integer;
