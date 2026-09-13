-- Admin-uploaded download files surfaced on the public /downloads page.
--
-- Each row is one externally-hosted file (admin pastes a URL – we don't
-- store the bytes). The fileType enum drives the badge label/color on
-- the public card; the category enum groups files under section headings.
-- publishedAt doubles as a draft flag: NULL = draft, set = public.

DO $$$ BEGIN
  CREATE TYPE "DownloadFileType" AS ENUM (
    'PDF',
    'DOC',
    'XLS',
    'JPG',
    'PNG',
    'ZIP',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$$;

DO $$$ BEGIN
  CREATE TYPE "DownloadCategory" AS ENUM (
    'SCHEDULE',
    'RULES',
    'FORMS',
    'BROCHURE',
    'RESULTS',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$$;

CREATE TABLE IF NOT EXISTS "festival_download" (
  "id" text NOT NULL PRIMARY KEY,
  "festivalId" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "fileUrl" text NOT NULL,
  "fileType" "DownloadFileType" NOT NULL,
  "category" "DownloadCategory" NOT NULL,
  "publishedAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_name" text,
  "created_by_email" text
);

ALTER TABLE "festival_download"
  ADD CONSTRAINT "festival_download_festivalId_fkey"
  FOREIGN KEY ("festivalId")
  REFERENCES "festival"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "festival_download_festival_idx"
  ON "festival_download" USING btree ("festivalId");
