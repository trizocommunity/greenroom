-- Category programme participation limits.
--
-- Stores per-category caps on how many programmes a participant in that
-- category can be assigned to, broken down by stageType:
--   max_stage      – cap on STAGE programmes  (NULL = unlimited)
--   max_non_stage  – cap on NON_STAGE programmes (NULL = unlimited)
--   max_all        – combined cap across all types (NULL = unlimited)
--
-- A null value means "no limit" for that dimension. The table uses a
-- 1:1 relationship with category (one row per category, only created when
-- a limit is configured). Limits are soft — assignments always proceed,
-- but violations are flagged as warnings in the assignment rows, participant
-- details dialog, and the team-leader dashboard.
--
-- Scoped to PRO tier festivals only (enforced at the application layer).

CREATE TABLE IF NOT EXISTS "category_programme_limit" (
  "id" text NOT NULL PRIMARY KEY,
  "festival_id" text NOT NULL,
  "category_id" text NOT NULL,
  "max_stage" integer,
  "max_non_stage" integer,
  "max_all" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "category_programme_limit"
  ADD CONSTRAINT "category_programme_limit_festival_id_fkey"
  FOREIGN KEY ("festival_id")
  REFERENCES "festival"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "category_programme_limit"
  ADD CONSTRAINT "category_programme_limit_category_id_fkey"
  FOREIGN KEY ("category_id")
  REFERENCES "category"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "category_programme_limit_category_id_key"
  ON "category_programme_limit" USING btree ("category_id");

CREATE INDEX IF NOT EXISTS "category_programme_limit_festival_id_idx"
  ON "category_programme_limit" USING btree ("festival_id");
