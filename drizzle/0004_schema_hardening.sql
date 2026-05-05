-- Compatibility-safe schema hardening for production reads/writes.
-- Focus: stronger integrity + targeted indexing without breaking API contracts.

-- Unique names within a festival scope
CREATE UNIQUE INDEX IF NOT EXISTS "category_festivalId_name_key"
  ON "category" USING btree ("festivalId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "group_festivalId_name_key"
  ON "group" USING btree ("festivalId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "stage_festivalId_name_key"
  ON "stage" USING btree ("festivalId", "name");

-- Read-heavy query indexes
CREATE INDEX IF NOT EXISTS "programme_assignment_programmeId_teamNumber_idx"
  ON "programme_assignment" USING btree ("programmeId", "teamNumber");

CREATE INDEX IF NOT EXISTS "result_programmeId_position_idx"
  ON "result" USING btree ("programmeId", "position");

CREATE INDEX IF NOT EXISTS "programme_notification_recipientUserId_createdAt_idx"
  ON "programme_notification" USING btree ("recipientUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "programme_notification_recipientStudentId_createdAt_idx"
  ON "programme_notification" USING btree ("recipientStudentId", "createdAt" DESC);

-- Integrity checks for polymorphic recipient/assignee rows
ALTER TABLE "programme_notification"
  DROP CONSTRAINT IF EXISTS "programme_notification_exactly_one_recipient_chk";
ALTER TABLE "programme_notification"
  ADD CONSTRAINT "programme_notification_exactly_one_recipient_chk"
  CHECK (
    (CASE WHEN "recipientUserId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "recipientStudentId" IS NULL THEN 0 ELSE 1 END) = 1
  );

ALTER TABLE "programme_assignment"
  DROP CONSTRAINT IF EXISTS "programme_assignment_target_present_chk";
ALTER TABLE "programme_assignment"
  ADD CONSTRAINT "programme_assignment_target_present_chk"
  CHECK (
    (CASE WHEN "studentId" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "groupId" IS NULL THEN 0 ELSE 1 END) >= 1
  );

