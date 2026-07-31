-- Migration: drop GREEN_ROOM_SIGN and SCHEDULE_CONFLICTS from ExportType.
-- These two export types were removed from the product. Postgres cannot drop
-- enum values in place, so the enum is recreated. Any rows using the removed
-- values are deleted first (there are none in practice — no generator ever
-- produced them).

DELETE FROM "festival_export"
  WHERE "type" IN ('GREEN_ROOM_SIGN', 'SCHEDULE_CONFLICTS');

ALTER TYPE "ExportType" RENAME TO "ExportType_old";

CREATE TYPE "ExportType" AS ENUM (
  'CALL_LIST', 'RESULTS', 'TEAM_RESULT', 'JUDGE_LIST', 'VALUATION_SHEET',
  'BADGE', 'CERTIFICATE'
);

ALTER TABLE "festival_export"
  ALTER COLUMN "type" TYPE "ExportType" USING "type"::text::"ExportType";

DROP TYPE "ExportType_old";
