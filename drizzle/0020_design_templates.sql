-- Design templates: MEDIA role, poster templates, programme default poster code

ALTER TYPE "FestivalRole" ADD VALUE IF NOT EXISTS 'MEDIA';

CREATE TYPE "PosterTemplateType" AS ENUM ('RESULT', 'TEAM_POINTS', 'CANDIDATE_CARD');
CREATE TYPE "PosterTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "festival_poster_template" (
  "id" text PRIMARY KEY NOT NULL,
  "festival_id" text NOT NULL,
  "type" "PosterTemplateType" NOT NULL,
  "code" text NOT NULL,
  "status" "PosterTemplateStatus" DEFAULT 'DRAFT' NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "konva_json" jsonb NOT NULL,
  "background_url" text,
  "meta" jsonb,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "festival_poster_template_festivalId_code_key"
  ON "festival_poster_template" ("festival_id", "code");

CREATE INDEX "festival_poster_template_festivalId_status_idx"
  ON "festival_poster_template" ("festival_id", "status");

ALTER TABLE "festival_poster_template"
  ADD CONSTRAINT "festival_poster_template_festivalId_fkey"
  FOREIGN KEY ("festival_id") REFERENCES "festival"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "programme" ADD COLUMN IF NOT EXISTS "result_poster_template_code" text;
