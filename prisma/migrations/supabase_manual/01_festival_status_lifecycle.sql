-- Festival Validity System – Migration 1: Festival status lifecycle
-- Run this ONCE in Supabase SQL Editor if you are not using Prisma migrate deploy.
-- Map: DRAFT -> READY, ACTIVE -> ONGOING, EXPIRED -> EXPIRED

CREATE TYPE "FestivalStatus_new" AS ENUM ('READY', 'ONGOING', 'PAST', 'EXPIRED');

ALTER TABLE "festival" ADD COLUMN "status_new" "FestivalStatus_new";

UPDATE "festival"
SET "status_new" = CASE
  WHEN "status"::text = 'DRAFT' THEN 'READY'::"FestivalStatus_new"
  WHEN "status"::text = 'ACTIVE' THEN 'ONGOING'::"FestivalStatus_new"
  WHEN "status"::text = 'EXPIRED' THEN 'EXPIRED'::"FestivalStatus_new"
  ELSE 'READY'::"FestivalStatus_new"
END;

ALTER TABLE "festival" DROP COLUMN "status";
ALTER TABLE "festival" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "festival" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "festival" ALTER COLUMN "status" SET DEFAULT 'READY';

DROP TYPE "FestivalStatus";
ALTER TYPE "FestivalStatus_new" RENAME TO "FestivalStatus";
