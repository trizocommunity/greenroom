-- Add judge session lock lifecycle and submitter identity fields.
ALTER TABLE "programme_judge_session"
ADD COLUMN "opened_at" TIMESTAMP(3),
ADD COLUMN "open_expires_at" TIMESTAMP(3),
ADD COLUMN "open_nonce_hash" TEXT,
ADD COLUMN "open_client_fingerprint_hash" TEXT,
ADD COLUMN "submitted_by_name" TEXT,
ADD COLUMN "submitted_by_contact" TEXT,
ADD COLUMN "submitted_by_note" TEXT;

-- Fast lookups for single-use and open-lock checks.
CREATE INDEX "programme_judge_session_token_hash_used_at_idx"
ON "programme_judge_session"("token_hash", "used_at");

CREATE INDEX "programme_judge_session_open_expires_at_idx"
ON "programme_judge_session"("open_expires_at");
