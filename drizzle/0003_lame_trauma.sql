-- Safe if migration 0002 was never applied (column/constraint/index may be absent).
ALTER TABLE "result" DROP CONSTRAINT IF EXISTS "result_codeLetterId_programme_code_letter_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "result_codeLetterId_idx";
--> statement-breakpoint
ALTER TABLE "result" DROP COLUMN IF EXISTS "codeLetterId";
