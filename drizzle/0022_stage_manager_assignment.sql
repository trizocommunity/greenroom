-- Migration: Stage manager <-> stage assignment
-- A STAGE_MANAGER festival member only operates within the stage(s) they're
-- explicitly assigned to. Many-to-many: one manager can cover multiple stages,
-- one stage can have multiple managers.

CREATE TABLE IF NOT EXISTS "stage_manager_assignment" (
  "id" text PRIMARY KEY,
  "festivalId" text NOT NULL,
  "stageId" text NOT NULL,
  "memberId" text NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "stage_manager_assignment_stageId_memberId_key"
  ON "stage_manager_assignment" ("stageId", "memberId");

CREATE INDEX IF NOT EXISTS "stage_manager_assignment_memberId_idx"
  ON "stage_manager_assignment" ("memberId");

DO $$ BEGIN
  ALTER TABLE "stage_manager_assignment"
    ADD CONSTRAINT "stage_manager_assignment_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "festival"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stage_manager_assignment"
    ADD CONSTRAINT "stage_manager_assignment_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "stage"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stage_manager_assignment"
    ADD CONSTRAINT "stage_manager_assignment_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "festival_member"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
