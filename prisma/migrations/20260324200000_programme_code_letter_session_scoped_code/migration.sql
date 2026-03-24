-- Allow the same letter (e.g. "A") in different reporting sessions; uniqueness is per session.
DROP INDEX IF EXISTS "programme_code_letter_code_key";

CREATE UNIQUE INDEX "programme_code_letter_reportingSessionId_code_key"
  ON "programme_code_letter"("reportingSessionId", "code");
