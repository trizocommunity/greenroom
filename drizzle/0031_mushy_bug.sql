ALTER TABLE "festival" ADD COLUMN "programmeAssignmentCanAdd" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "programmeAssignmentCanDelete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "participantCreationCanAdd" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "participantCreationCanEdit" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "domain_https_ready_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "queue_position" integer;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "revealed_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "revealed_by" text;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ADD COLUMN "checkout_completed_at" timestamp(3) with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "programme_code_letter_session_queue_position_key" ON "programme_code_letter" USING btree ("reportingSessionId","queue_position") WHERE "programme_code_letter"."queue_position" is not null;--> statement-breakpoint
CREATE INDEX "programme_code_letter_session_revealed_at_idx" ON "programme_code_letter" USING btree ("reportingSessionId","revealed_at");