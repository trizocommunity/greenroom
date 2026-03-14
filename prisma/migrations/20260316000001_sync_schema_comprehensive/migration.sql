-- Comprehensive schema sync: add missing columns and tables so DB matches Prisma schema.
-- Safe to run: uses IF NOT EXISTS / DO blocks where needed.

-- ---------------------------------------------------------------------------
-- Programme: add columns (schema uses maxParticipantsPerGroup, maxTeamsPerGroup, maxStudentsPerTeam)
-- ---------------------------------------------------------------------------
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "maxParticipantsPerGroup" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "maxTeamsPerGroup" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "maxStudentsPerTeam" INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- ProgrammeAssignment: add columns
-- ---------------------------------------------------------------------------
ALTER TABLE "programme_assignment" ADD COLUMN IF NOT EXISTS "teamNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "programme_assignment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "programme_assignment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- PasswordResetToken: add updatedAt if missing
-- ---------------------------------------------------------------------------
ALTER TABLE "password_reset_token" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- EventType enum and event table
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "EventType" AS ENUM ('GENERAL', 'CEREMONY', 'TALK', 'CONCERT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "event" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3),
  "location" TEXT,
  "type" "EventType" NOT NULL DEFAULT 'GENERAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "event_festivalId_idx" ON "event"("festivalId");

DO $$ BEGIN
  ALTER TABLE "event" ADD CONSTRAINT "event_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Result table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "result" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "grade" TEXT,
  "position" INTEGER,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "points" INTEGER NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "result_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "result_assignmentId_key" ON "result"("assignmentId");
CREATE INDEX IF NOT EXISTS "result_festivalId_createdAt_idx" ON "result"("festivalId", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "result" ADD CONSTRAINT "result_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "result" ADD CONSTRAINT "result_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "result" ADD CONSTRAINT "result_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "programme_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Stage table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "stage" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stage_festivalId_idx" ON "stage"("festivalId");

DO $$ BEGIN
  ALTER TABLE "stage" ADD CONSTRAINT "stage_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
