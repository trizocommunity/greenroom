-- Migration: Deadlines become open/close windows.
--
--   The two team-leader deadlines (programme assignment, participant
--   creation) each gain a start date. A window is open only between its
--   start and its deadline; before the start it is upcoming, after the
--   deadline it is closed. A NULL start means "open from the beginning",
--   so existing rows keep their current behaviour.

BEGIN;

ALTER TABLE "festival" ADD COLUMN "programmeAssignmentStartDate" TIMESTAMPTZ(3);
ALTER TABLE "festival" ADD COLUMN "participantCreationStartDate" TIMESTAMPTZ(3);

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────────
-- BEGIN;
-- ALTER TABLE "festival" DROP COLUMN IF EXISTS "programmeAssignmentStartDate";
-- ALTER TABLE "festival" DROP COLUMN IF EXISTS "participantCreationStartDate";
-- COMMIT;
