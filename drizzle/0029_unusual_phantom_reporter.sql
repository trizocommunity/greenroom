ALTER TABLE "institution" ADD COLUMN "customDomain" text;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "verifiedAt" timestamp(3) with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "institution_customDomain_key" ON "institution" USING btree ("customDomain");