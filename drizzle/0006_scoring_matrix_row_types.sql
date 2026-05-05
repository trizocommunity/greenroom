ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "criteria_type" text DEFAULT 'PARTICIPANT_RANGE' NOT NULL;

ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "row_label" text;

ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "programme_ids" jsonb;

