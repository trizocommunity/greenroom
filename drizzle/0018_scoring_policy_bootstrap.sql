-- Ensure scoring-policy tables/columns exist in environments that missed prior setup.

CREATE TABLE IF NOT EXISTS "festival_scoring_policy" (
  "id" text PRIMARY KEY NOT NULL,
  "festival_id" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "normalize_to" integer DEFAULT 100 NOT NULL,
  "no_grade_below" integer DEFAULT 50 NOT NULL,
  "grade_rules" jsonb NOT NULL,
  "created_by" text,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "normalize_to" integer DEFAULT 100 NOT NULL;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "no_grade_below" integer DEFAULT 50 NOT NULL;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "grade_rules" jsonb;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE "festival_scoring_policy"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;

UPDATE "festival_scoring_policy"
SET "grade_rules" = '[]'::jsonb
WHERE "grade_rules" IS NULL;

ALTER TABLE "festival_scoring_policy"
  ALTER COLUMN "grade_rules" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "festival_scoring_policy_festivalId_key"
  ON "festival_scoring_policy" USING btree ("festival_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'festival_scoring_policy_festivalId_fkey'
  ) THEN
    ALTER TABLE "festival_scoring_policy"
      ADD CONSTRAINT "festival_scoring_policy_festivalId_fkey"
      FOREIGN KEY ("festival_id") REFERENCES "festival"("id")
      ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "festival_scoring_award_rule" (
  "id" text PRIMARY KEY NOT NULL,
  "festival_id" text NOT NULL,
  "scoring_policy_id" text NOT NULL,
  "criteria_type" text DEFAULT 'PARTICIPANT_RANGE' NOT NULL,
  "row_label" text,
  "programme_ids" jsonb,
  "category_id" text,
  "programme_type" "ProgrammeType",
  "min_participants" integer DEFAULT 1 NOT NULL,
  "max_participants" integer,
  "grade" text NOT NULL,
  "award_points" integer NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "criteria_type" text DEFAULT 'PARTICIPANT_RANGE' NOT NULL;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "row_label" text;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "programme_ids" jsonb;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "category_id" text;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "programme_type" "ProgrammeType";
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "min_participants" integer DEFAULT 1 NOT NULL;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "max_participants" integer;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "grade" text;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "award_points" integer;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE "festival_scoring_award_rule"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'festival_scoring_award_rule_festivalId_fkey'
  ) THEN
    ALTER TABLE "festival_scoring_award_rule"
      ADD CONSTRAINT "festival_scoring_award_rule_festivalId_fkey"
      FOREIGN KEY ("festival_id") REFERENCES "festival"("id")
      ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'festival_scoring_award_rule_scoringPolicyId_fkey'
  ) THEN
    ALTER TABLE "festival_scoring_award_rule"
      ADD CONSTRAINT "festival_scoring_award_rule_scoringPolicyId_fkey"
      FOREIGN KEY ("scoring_policy_id") REFERENCES "festival_scoring_policy"("id")
      ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'festival_scoring_award_rule_categoryId_fkey'
  ) THEN
    ALTER TABLE "festival_scoring_award_rule"
      ADD CONSTRAINT "festival_scoring_award_rule_categoryId_fkey"
      FOREIGN KEY ("category_id") REFERENCES "category"("id")
      ON DELETE set null ON UPDATE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "festival_scoring_award_rule_festivalId_idx"
  ON "festival_scoring_award_rule" USING btree ("festival_id");
CREATE INDEX IF NOT EXISTS "festival_scoring_award_rule_scoringPolicyId_idx"
  ON "festival_scoring_award_rule" USING btree ("scoring_policy_id");
CREATE INDEX IF NOT EXISTS "festival_scoring_award_rule_categoryId_idx"
  ON "festival_scoring_award_rule" USING btree ("category_id");
