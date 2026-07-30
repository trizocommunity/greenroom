CREATE TYPE "public"."ProgrammeTeamLeadAppointedByRole" AS ENUM('ADMIN', 'TEAM_LEADER');--> statement-breakpoint
CREATE TABLE "programme_team_lead" (
	"id" text PRIMARY KEY NOT NULL,
	"programmeId" text NOT NULL,
	"groupId" text NOT NULL,
	"teamNumber" integer DEFAULT 1 NOT NULL,
	"participantId" text NOT NULL,
	"appointedBy" text NOT NULL,
	"appointedByRole" "ProgrammeTeamLeadAppointedByRole" DEFAULT 'ADMIN' NOT NULL,
	"appointedByName" text,
	"appointedByEmail" text,
	"appointedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_manager_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"stageId" text NOT NULL,
	"memberId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE "realtime_outbox" CASCADE;--> statement-breakpoint
DROP TABLE "team_leader_otp" CASCADE;--> statement-breakpoint
DROP TABLE "team_leader_session" CASCADE;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "published_by_email" text;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "published_by_name" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "saved_by_email" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "saved_by_name" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "published_by_email" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "published_by_name" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "announced_by_email" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "announced_by_name" text;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ADD CONSTRAINT "programme_team_lead_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ADD CONSTRAINT "programme_team_lead_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ADD CONSTRAINT "programme_team_lead_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_manager_assignment" ADD CONSTRAINT "stage_manager_assignment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_manager_assignment" ADD CONSTRAINT "stage_manager_assignment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_manager_assignment" ADD CONSTRAINT "stage_manager_assignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."festival_member"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "programme_team_lead_team_key" ON "programme_team_lead" USING btree ("programmeId","groupId","teamNumber");--> statement-breakpoint
CREATE INDEX "programme_team_lead_programmeId_idx" ON "programme_team_lead" USING btree ("programmeId");--> statement-breakpoint
CREATE INDEX "programme_team_lead_participantId_idx" ON "programme_team_lead" USING btree ("participantId");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_manager_assignment_stageId_memberId_key" ON "stage_manager_assignment" USING btree ("stageId","memberId");--> statement-breakpoint
CREATE INDEX "stage_manager_assignment_memberId_idx" ON "stage_manager_assignment" USING btree ("memberId");--> statement-breakpoint
DROP TYPE "public"."RealtimeOutboxStatus";