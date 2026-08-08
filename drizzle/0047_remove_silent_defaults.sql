-- Remove silent DB defaults from festival-domain columns. Forces every INSERT
-- to pass tier / isLocked / status / publicSiteEnabled / expiresAt / payment.tier
-- explicitly, closing the bug class that produced the PRO->STANDARD incident.
--
-- Backfill must run BEFORE SET NOT NULL in each step.
--
-- festival_member.role default flips from ANNOUNCER to VOLUNTEER so the
-- lowest-privileged role is the silent fallback. Callers that need ADMIN,
-- STAGE_MANAGER, etc. already set role explicitly (see festival-crud,
-- invitation-accept, addMemberAction).

UPDATE "payment"
SET "tier" = 'BASIC'
WHERE "tier" IS NULL;
--> statement-breakpoint

ALTER TABLE "payment"
ALTER COLUMN "tier" SET NOT NULL;
--> statement-breakpoint

UPDATE "festival"
SET "expiresAt" = NOW() + INTERVAL '90 days'
WHERE "expiresAt" IS NULL;
--> statement-breakpoint

ALTER TABLE "festival"
ALTER COLUMN "expiresAt" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "festival" ALTER COLUMN "isLocked" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "festival" ALTER COLUMN "tier" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "festival" ALTER COLUMN "publicSiteEnabled" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "festival" ALTER COLUMN "scoringSystem" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "festival" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "festival_member" ALTER COLUMN "role" SET DEFAULT 'VOLUNTEER';