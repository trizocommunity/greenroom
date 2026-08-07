-- Replace the single (reportingSessionId, assignmentId) unique index with two
-- partial unique indexes that match the new GROUP fan-out data model introduced
-- by migration 0041 (programme_type_xor_invariant).
--
-- After 0041, programme_reported_participant holds ONE row per
-- (reportingSessionId, assignmentMemberId) for GROUP programmes and ONE row per
-- (reportingSessionId, assignmentId) for INDIVIDUAL programmes (assignmentMemberId IS NULL).
-- The old UNIQUE (reportingSessionId, assignmentId) blocked GROUP teams with
-- multiple members from being saved.

DROP INDEX IF EXISTS "programme_reported_participant_reportingSessionId_assignmentId_";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "programme_reported_participant_individual_unique"
  ON "programme_reported_participant" USING btree (
    "reportingSessionId" ASC NULLS LAST,
    "assignmentId" ASC NULLS LAST
  )
  WHERE "assignmentMemberId" IS NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "programme_reported_participant_group_member_unique"
  ON "programme_reported_participant" USING btree (
    "reportingSessionId" ASC NULLS LAST,
    "assignmentId" ASC NULLS LAST,
    "assignmentMemberId" ASC NULLS LAST
  )
  WHERE "assignmentMemberId" IS NOT NULL;
