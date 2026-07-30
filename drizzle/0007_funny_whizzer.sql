CREATE TYPE "public"."AccountType" AS ENUM('PERSONAL', 'INSTITUTIONAL');--> statement-breakpoint
CREATE TYPE "public"."FestivalType" AS ENUM('INSTITUTIONAL', 'INDEPENDENT');--> statement-breakpoint
ALTER TYPE "public"."InstitutionType" ADD VALUE 'DARS';--> statement-breakpoint
CREATE TABLE "expired_festival_manual_book" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"data" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "InstitutionType" NOT NULL,
	"affiliation" text,
	"city" text,
	"sizeRange" text,
	"ownerId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link_token" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"usedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "magic_link_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pending_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"festivalId" text NOT NULL,
	"festivalRole" "FestivalRole" NOT NULL,
	"invitedBy" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"acceptedAt" timestamp(3),
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "password_reset_token" CASCADE;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "teamLeaderLimit" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "institutionId" text;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "festivalType" "FestivalType" DEFAULT 'INDEPENDENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "accountType" "AccountType";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "institutionId" text;--> statement-breakpoint
ALTER TABLE "expired_festival_manual_book" ADD CONSTRAINT "expired_festival_manual_book_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pending_invitation" ADD CONSTRAINT "pending_invitation_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pending_invitation" ADD CONSTRAINT "pending_invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "expired_festival_manual_book_festivalId_idx" ON "expired_festival_manual_book" USING btree ("festivalId");--> statement-breakpoint
CREATE UNIQUE INDEX "institution_ownerId_key" ON "institution" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "magic_link_token_email_idx" ON "magic_link_token" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invitation_token_key" ON "pending_invitation" USING btree ("id");--> statement-breakpoint
CREATE INDEX "pending_invitation_festivalId_idx" ON "pending_invitation" USING btree ("festivalId");--> statement-breakpoint
ALTER TABLE "festival" ADD CONSTRAINT "festival_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institution"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institution"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "category_festivalId_idx" ON "category" USING btree ("festivalId");--> statement-breakpoint
CREATE INDEX "result_programmeId_isPublished_idx" ON "result" USING btree ("programmeId","isPublished");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "age";