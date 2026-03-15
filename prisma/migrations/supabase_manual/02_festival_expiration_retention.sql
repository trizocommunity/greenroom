-- Festival Validity System – Migration 2: Expiration retention (idempotent)
-- Run once in Supabase SQL Editor after 01_festival_status_lifecycle.sql.
-- Safe to re-run if some objects already exist (uses IF NOT EXISTS / DO block).

-- Add columns to festival (ignore if already exist)
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "resultPdfUrl" TEXT;
ALTER TABLE "festival" ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP(3);

-- Create enum only if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FestivalLifecycleEventType') THEN
    CREATE TYPE "FestivalLifecycleEventType" AS ENUM ('CREATED', 'ACTIVATED', 'EXPIRED');
  END IF;
END
$$;

-- Create tables only if they do not exist
CREATE TABLE IF NOT EXISTS "expired_festival_result" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "categoryName" TEXT,
    "participantName" TEXT NOT NULL,
    "position" INTEGER,
    "grade" TEXT,
    "score" DOUBLE PRECISION,
    "points" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expired_festival_result_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "festival_lifecycle_event" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "event" "FestivalLifecycleEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "festival_lifecycle_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expired_festival_result_festivalId_idx" ON "expired_festival_result"("festivalId");
CREATE INDEX IF NOT EXISTS "festival_lifecycle_event_festivalId_idx" ON "festival_lifecycle_event"("festivalId");

-- Add foreign keys only if they do not exist (Postgres 9.6+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expired_festival_result_festivalId_fkey'
  ) THEN
    ALTER TABLE "expired_festival_result"
    ADD CONSTRAINT "expired_festival_result_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'festival_lifecycle_event_festivalId_fkey'
  ) THEN
    ALTER TABLE "festival_lifecycle_event"
    ADD CONSTRAINT "festival_lifecycle_event_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
