-- Scratch-to-reveal reporting flow.
--
-- Replaces the spin-wheel code assignment with a two-step reporting drawer:
--   step 1 (checkout) marks who is present  -> programme_reported_participant
--   step 2 (scratch)  reveals a code letter -> programme_code_letter.revealed_at
--
-- "Reported" now means "scratched and received a code letter", i.e.
-- programme_code_letter.revealed_at IS NOT NULL. The candidate list written at
-- scan time (programme_reported_participant) is unchanged and stays provisional.
--
-- checkout_completed_at is the gate between the two steps: it is set once, when
-- the stage manager finishes checkout, and it is the moment all code letters for
-- the session are generated (pre-shuffled, with a fixed queue_position).
-- The client derives its wizard step from it, so a refresh mid-scratch resumes.
--
-- All three code-letter columns are nullable with no default: code letters
-- issued by the previous flow have no queue position and were never scratched,
-- and a NULL revealed_at is exactly the "unscratched" state.

ALTER TABLE "programme_reporting_session"
ADD COLUMN IF NOT EXISTS "checkout_completed_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "programme_code_letter"
ADD COLUMN IF NOT EXISTS "queue_position" integer;
--> statement-breakpoint

ALTER TABLE "programme_code_letter"
ADD COLUMN IF NOT EXISTS "revealed_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "programme_code_letter"
ADD COLUMN IF NOT EXISTS "revealed_by" text;
--> statement-breakpoint

-- Sessions closed under the old flow already have their code letters issued and
-- are semantically past checkout. Backfill so historical sessions do not appear
-- to the client as "stuck before step 2", and so reopen/reset paths behave.
UPDATE "programme_reporting_session"
SET "checkout_completed_at" = COALESCE("endedAt", "startedAt", "updatedAt")
WHERE "status" = 'CLOSED'
  AND "checkout_completed_at" IS NULL;
--> statement-breakpoint

-- Code letters that already exist were issued by the spin/close flow, which had
-- no scratch step. Treat them as revealed at issue time so that judgement and
-- the reported-count queries (which now filter on revealed_at) keep seeing them.
UPDATE "programme_code_letter"
SET "revealed_at" = "issuedAt",
    "revealed_by" = "issuedBy"
WHERE "revealed_at" IS NULL;
--> statement-breakpoint

-- One tile per queue slot within a session. Partial so that legacy rows with a
-- NULL queue_position do not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS "programme_code_letter_session_queue_position_key"
  ON "programme_code_letter" USING btree (
    "reportingSessionId" ASC NULLS LAST,
    "queue_position" ASC NULLS LAST
  )
  WHERE "queue_position" IS NOT NULL;
--> statement-breakpoint

-- Drives the "how many tiles are still unscratched" lookup on every reveal.
CREATE INDEX IF NOT EXISTS "programme_code_letter_session_revealed_at_idx"
  ON "programme_code_letter" USING btree (
    "reportingSessionId" ASC NULLS LAST,
    "revealed_at" ASC NULLS LAST
  );
