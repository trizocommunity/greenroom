-- Migration: Programme team lead + audit columns on programme/result
-- Adds a first-class "programme team lead" concept — distinct from student.isTeamLeader.
-- Adds who/when audit columns to programme and result so the drawer can render an
-- audit trail without an audit_log join for the headline summary line.

-- New enum for the role that appointed the lead
DO $$ BEGIN
  CREATE TYPE "public"."ProgrammeTeamLeadAppointedByRole" AS ENUM('ADMIN', 'TEAM_LEADER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- New table: one lead per team within a programme
CREATE TABLE IF NOT EXISTS "programme_team_lead" (
  "id" text PRIMARY KEY,
  "programmeId" text NOT NULL,
  "groupId" text NOT NULL,
  "teamNumber" integer DEFAULT 1 NOT NULL,
  "studentId" text NOT NULL,
  "appointedBy" text NOT NULL,
  "appointedByRole" "public"."ProgrammeTeamLeadAppointedByRole" DEFAULT 'ADMIN' NOT NULL,
  "appointedByName" text,
  "appointedByEmail" text,
  "appointedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- DB-enforced uniqueness: exactly one lead per (programmeId, groupId, teamNumber)
CREATE UNIQUE INDEX IF NOT EXISTS "programme_team_lead_team_key"
  ON "programme_team_lead" ("programmeId", "groupId", "teamNumber");

CREATE INDEX IF NOT EXISTS "programme_team_lead_programmeId_idx"
  ON "programme_team_lead" ("programmeId");
CREATE INDEX IF NOT EXISTS "programme_team_lead_studentId_idx"
  ON "programme_team_lead" ("studentId");

-- Foreign keys with cascade so removal of programme/group/student cleans up
DO $$ BEGIN
  ALTER TABLE "programme_team_lead"
    ADD CONSTRAINT "programme_team_lead_programmeId_fkey"
    FOREIGN KEY ("programmeId") REFERENCES "programme"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "programme_team_lead"
    ADD CONSTRAINT "programme_team_lead_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "group"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "programme_team_lead"
    ADD CONSTRAINT "programme_team_lead_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "student"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Audit columns on programme (creator + publisher identity snapshot)
ALTER TABLE "programme"
  ADD COLUMN IF NOT EXISTS "created_by_email" text;
ALTER TABLE "programme"
  ADD COLUMN IF NOT EXISTS "created_by_name" text;
ALTER TABLE "programme"
  ADD COLUMN IF NOT EXISTS "published_by_email" text;
ALTER TABLE "programme"
  ADD COLUMN IF NOT EXISTS "published_by_name" text;

-- Audit columns on result (who saved / published / announced)
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "saved_by_email" text;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "saved_by_name" text;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "published_by_email" text;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "published_by_name" text;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "announced_by_email" text;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "announced_by_name" text;
