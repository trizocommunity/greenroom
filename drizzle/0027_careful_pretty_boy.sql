ALTER TABLE "festival" ALTER COLUMN "isLocked" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "expiresAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "tier" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "publicSiteEnabled" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "scoringSystem" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "timezone" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "festival_member" ALTER COLUMN "role" SET DEFAULT 'VOLUNTEER';--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "tier" SET NOT NULL;