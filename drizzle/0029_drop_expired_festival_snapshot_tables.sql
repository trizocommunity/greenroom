-- Migration: ISSUE-15 §1.3 — Drop the EXPIRED-festival snapshot tables.
--
-- The new lifecycle keeps the operational data on the live tables
-- (`programme`, `participant`, `result`, `group`, `category`, `stage`,
-- `scheduleEntry`, `programmeAssignment`) and regenerates the Manual Book PDF
-- on demand. The `expired_festival_result` and `expired_festival_manual_book`
-- snapshot tables are no longer written to and have been removed from
-- `schema.ts`; this migration drops them.
--
-- `expired_festival_manual_book.createdAt` is still referenced by 0027 — we
-- drop the table BEFORE 0027's leftovers would matter, since the column
-- rename only affects columns that exist when 0027 runs.

BEGIN;

DROP TABLE IF EXISTS "expired_festival_result";
DROP TABLE IF EXISTS "expired_festival_manual_book";

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────
-- BEGIN;
-- CREATE TABLE "expired_festival_result" (
--   "id" text PRIMARY KEY NOT NULL,
--   "festivalId" text NOT NULL,
--   "programmeName" text NOT NULL,
--   "categoryName" text,
--   "participantName" text NOT NULL,
--   "position" integer,
--   "grade" text,
--   "score" double precision,
--   "points" integer,
--   "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX "expired_festival_result_festivalId_idx"
--   ON "expired_festival_result" USING btree ("festivalId" ASC NULLS LAST);
--
-- CREATE TABLE "expired_festival_manual_book" (
--   "id" text PRIMARY KEY NOT NULL,
--   "festivalId" text NOT NULL,
--   "data" jsonb NOT NULL,
--   "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX "expired_festival_manual_book_festivalId_idx"
--   ON "expired_festival_manual_book" USING btree ("festivalId" ASC NULLS LAST);
-- COMMIT;
