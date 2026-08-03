-- Lock the programme.type discriminator:
--   1. Drop the column default on programme.type so every insert must specify it.
--   2. Add UNIQUE (programmeId, groupId, teamNumber) WHERE groupId IS NOT NULL on
--      programme_assignment so GROUP programmes cannot have duplicate team rows.
--   3. Add assignmentMemberId columns to programme_reported_participant and
--      programme_code_letter_recipient so GROUP fan-out can address individual members.

ALTER TABLE "programme"
  ALTER COLUMN "type" DROP DEFAULT;
--> statement-breakpoint

CREATE UNIQUE INDEX "programme_assignment_programmeId_groupId_teamNumber_key"
  ON "programme_assignment" USING btree (
    "programmeId" ASC NULLS LAST,
    "groupId" ASC NULLS LAST,
    "teamNumber" ASC NULLS LAST
  )
  WHERE "groupId" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "programme_reported_participant"
  ADD COLUMN IF NOT EXISTS "assignmentMemberId" text;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "programme_reported_participant_assignmentMemberId_idx"
  ON "programme_reported_participant" USING btree ("assignmentMemberId" ASC NULLS LAST);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "programme_reported_participant"
    ADD CONSTRAINT "programme_reported_participant_assignmentMemberId_fkey"
    FOREIGN KEY ("assignmentMemberId") REFERENCES "public"."programme_assignment_member"("id")
    ON UPDATE cascade ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "programme_code_letter_recipient"
  ADD COLUMN IF NOT EXISTS "assignmentMemberId" text;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "programme_code_letter_recipient"
    ADD CONSTRAINT "programme_code_letter_recipient_assignmentMemberId_fkey"
    FOREIGN KEY ("assignmentMemberId") REFERENCES "public"."programme_assignment_member"("id")
    ON UPDATE cascade ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
