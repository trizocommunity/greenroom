-- Create programme_assignment_member: per-member join row for GROUP programme assignments.
-- INDIVIDUAL programmes do not use this table; their participant lives directly on
-- programme_assignment.participantId. For GROUP programmes, the parent programme_assignment
-- row carries only (groupId, teamNumber) and each member is recorded here so code-letter
-- recipients, reporting, and judgement mapping can address individual members.

CREATE TABLE "programme_assignment_member" (
	"id" text PRIMARY KEY NOT NULL,
	"assignmentId" text NOT NULL,
	"participantId" text NOT NULL,
	"festivalId" text NOT NULL,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdByEmail" text,
	"createdByName" text
);
--> statement-breakpoint

CREATE UNIQUE INDEX "programme_assignment_member_assignmentId_participantId_key"
  ON "programme_assignment_member" USING btree ("assignmentId" ASC NULLS LAST, "participantId" ASC NULLS LAST);
--> statement-breakpoint

CREATE INDEX "programme_assignment_member_assignmentId_idx"
  ON "programme_assignment_member" USING btree ("assignmentId" ASC NULLS LAST);
--> statement-breakpoint

CREATE INDEX "programme_assignment_member_participantId_idx"
  ON "programme_assignment_member" USING btree ("participantId" ASC NULLS LAST);
--> statement-breakpoint

ALTER TABLE "programme_assignment_member"
  ADD CONSTRAINT "programme_assignment_member_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "public"."programme_assignment"("id")
  ON UPDATE cascade ON DELETE cascade;
--> statement-breakpoint

ALTER TABLE "programme_assignment_member"
  ADD CONSTRAINT "programme_assignment_member_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id")
  ON UPDATE cascade ON DELETE cascade;
--> statement-breakpoint

ALTER TABLE "programme_assignment_member"
  ADD CONSTRAINT "programme_assignment_member_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id")
  ON UPDATE cascade ON DELETE cascade;
