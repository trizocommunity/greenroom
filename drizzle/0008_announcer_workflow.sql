-- Announcer workflow: desk publish vs on-air announce, standings ceremony mode

ALTER TYPE "public"."ProgrammeStatus" ADD VALUE IF NOT EXISTS 'ANNOUNCED';

DO $$ BEGIN
  CREATE TYPE "public"."PublicDisplayMode" AS ENUM('programme_results', 'team_standings');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "festival"
  ADD COLUMN IF NOT EXISTS "publicDisplayMode" "public"."PublicDisplayMode" DEFAULT 'programme_results' NOT NULL;
ALTER TABLE "festival"
  ADD COLUMN IF NOT EXISTS "announcerResultsPerStandings" integer DEFAULT 10 NOT NULL;
ALTER TABLE "festival"
  ADD COLUMN IF NOT EXISTS "announcedProgrammesSinceStandings" integer DEFAULT 0 NOT NULL;

ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "isAnnounced" boolean DEFAULT false NOT NULL;
ALTER TABLE "result"
  ADD COLUMN IF NOT EXISTS "announcedAt" timestamp(3);

-- Backward compatibility: existing published results stay visible on public site
UPDATE "result" SET "isAnnounced" = true, "announcedAt" = COALESCE("announcedAt", "updatedAt")
WHERE "isPublished" = true AND "isAnnounced" = false;
