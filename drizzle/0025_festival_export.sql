-- Migration: festival_export
-- Festival-scoped export jobs (call lists, results, badges, certificates, ...).
-- Generated files are stored inline as base64 (`fileData`) with no external
-- object storage, and pruned 2 days after queueing by the daily cron.

DO $$ BEGIN
  CREATE TYPE "ExportType" AS ENUM (
    'CALL_LIST', 'RESULTS', 'TEAM_RESULT', 'JUDGE_LIST', 'VALUATION_SHEET',
    'GREEN_ROOM_SIGN', 'SCHEDULE_CONFLICTS', 'BADGE', 'CERTIFICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'CSV');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "festival_export" (
  "id" text PRIMARY KEY,
  "festivalId" text NOT NULL,
  "type" "ExportType" NOT NULL,
  "format" "ExportFormat" NOT NULL,
  "status" "ExportStatus" DEFAULT 'PROCESSING' NOT NULL,
  "summary" text NOT NULL,
  "config" jsonb NOT NULL,
  "fileName" text,
  "fileData" text,
  "fileSizeBytes" integer,
  "mimeType" text,
  "itemCount" integer,
  "errorMessage" text,
  "createdBy" text NOT NULL,
  "queuedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "completedAt" timestamp(3),
  "completedInMs" integer,
  "expiresAt" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "festival_export_festivalId_queuedAt_idx"
  ON "festival_export" ("festivalId", "queuedAt" DESC);

CREATE INDEX IF NOT EXISTS "festival_export_expiresAt_idx"
  ON "festival_export" ("expiresAt");

DO $$ BEGIN
  ALTER TABLE "festival_export"
    ADD CONSTRAINT "festival_export_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "festival"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "festival_export"
    ADD CONSTRAINT "festival_export_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "user"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
