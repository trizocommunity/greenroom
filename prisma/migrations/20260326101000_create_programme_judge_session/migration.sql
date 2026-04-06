-- Create programme_judge_session table before adding judge lock fields.
CREATE TABLE "programme_judge_session" (
  "id" TEXT NOT NULL,
  "festival_id" TEXT NOT NULL,
  "programme_id" TEXT NOT NULL,
  "reporting_session_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "programme_judge_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programme_judge_session_token_hash_key"
  ON "programme_judge_session"("token_hash");

CREATE INDEX "programme_judge_session_programme_id_used_at_idx"
  ON "programme_judge_session"("programme_id", "used_at");

CREATE INDEX "programme_judge_session_reporting_session_id_idx"
  ON "programme_judge_session"("reporting_session_id");

ALTER TABLE "programme_judge_session"
  ADD CONSTRAINT "programme_judge_session_festival_id_fkey"
  FOREIGN KEY ("festival_id") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "programme_judge_session"
  ADD CONSTRAINT "programme_judge_session_programme_id_fkey"
  FOREIGN KEY ("programme_id") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "programme_judge_session"
  ADD CONSTRAINT "programme_judge_session_reporting_session_id_fkey"
  FOREIGN KEY ("reporting_session_id") REFERENCES "programme_reporting_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
