CREATE TABLE "participant_otp" (
	"id" text PRIMARY KEY NOT NULL,
	"participantId" text NOT NULL,
	"codeHash" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_session" (
	"id" text PRIMARY KEY NOT NULL,
	"participantId" text NOT NULL,
	"festivalId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"revokedAt" timestamp(3),
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant" ADD COLUMN "dateOfBirth" timestamp(3);--> statement-breakpoint
ALTER TABLE "participant_otp" ADD CONSTRAINT "participant_otp_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_session" ADD CONSTRAINT "participant_session_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_session" ADD CONSTRAINT "participant_session_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "participant_otp_expiresAt_idx" ON "participant_otp" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "participant_otp_participantId_expiresAt_idx" ON "participant_otp" USING btree ("participantId","expiresAt");--> statement-breakpoint
CREATE INDEX "participant_session_expiresAt_idx" ON "participant_session" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "participant_session_festivalId_expiresAt_idx" ON "participant_session" USING btree ("festivalId","expiresAt");--> statement-breakpoint
CREATE INDEX "participant_session_participantId_expiresAt_idx" ON "participant_session" USING btree ("participantId","expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_session_tokenHash_key" ON "participant_session" USING btree ("tokenHash");