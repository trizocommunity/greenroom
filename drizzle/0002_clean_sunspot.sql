ALTER TABLE "result" ADD COLUMN "codeLetterId" text;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_codeLetterId_programme_code_letter_id_fk" FOREIGN KEY ("codeLetterId") REFERENCES "public"."programme_code_letter"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "result_codeLetterId_idx" ON "result" USING btree ("codeLetterId");