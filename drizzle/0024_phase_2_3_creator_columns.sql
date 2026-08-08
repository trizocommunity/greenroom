-- Custom SQL migration file, put your code below! --

-- Add columns for Phase 2
ALTER TABLE "schedule_entry" ADD COLUMN "created_by_name" text;
ALTER TABLE "schedule_entry" ADD COLUMN "created_by_email" text;

ALTER TABLE "festival_scoring_policy" ADD COLUMN "created_by_name" text;
ALTER TABLE "festival_scoring_policy" ADD COLUMN "created_by_email" text;

ALTER TABLE "judgement_config" ADD COLUMN "created_by_name" text;
ALTER TABLE "judgement_config" ADD COLUMN "created_by_email" text;

ALTER TABLE "festival_export" ADD COLUMN "created_by_name" text;
ALTER TABLE "festival_export" ADD COLUMN "created_by_email" text;

-- Add columns for Phase 3
ALTER TABLE "category" ADD COLUMN "created_by_name" text;
ALTER TABLE "category" ADD COLUMN "created_by_email" text;

ALTER TABLE "group" ADD COLUMN "created_by_name" text;
ALTER TABLE "group" ADD COLUMN "created_by_email" text;

ALTER TABLE "judge" ADD COLUMN "created_by_name" text;
ALTER TABLE "judge" ADD COLUMN "created_by_email" text;

ALTER TABLE "festival_news" ADD COLUMN "created_by_name" text;
ALTER TABLE "festival_news" ADD COLUMN "created_by_email" text;

-- Backfill Phase 2 tables
UPDATE "schedule_entry" se
SET 
  "created_by_name" = COALESCE(u.display_name, u.full_name, u.email, 'System'),
  "created_by_email" = u.email
FROM "user" u
WHERE se."created_by" = u.id;

UPDATE "schedule_entry"
SET "created_by_name" = 'System'
WHERE "created_by" = 'System';

UPDATE "festival_scoring_policy" fsp
SET 
  "created_by_name" = COALESCE(u.display_name, u.full_name, u.email, 'System'),
  "created_by_email" = u.email
FROM "user" u
WHERE fsp."created_by" = u.id;

UPDATE "festival_scoring_policy"
SET "created_by_name" = 'System'
WHERE "created_by" = 'System';

UPDATE "festival_export" fe
SET 
  "created_by_name" = COALESCE(u.display_name, u.full_name, u.email, 'System'),
  "created_by_email" = u.email
FROM "user" u
WHERE fe."created_by" = u.id;

UPDATE "festival_export"
SET "created_by_name" = 'System'
WHERE "created_by" = 'System';

UPDATE "judgement_config" jc
SET 
  "created_by_name" = COALESCE(u.display_name, u.full_name, u.email, 'System'),
  "created_by_email" = u.email
FROM "user" u
WHERE jc."started_by" = u.id;

-- Drop obsolete created_by columns
ALTER TABLE "schedule_entry" DROP COLUMN "created_by";
ALTER TABLE "festival_scoring_policy" DROP COLUMN "created_by";
ALTER TABLE "festival_export" DROP COLUMN "created_by";