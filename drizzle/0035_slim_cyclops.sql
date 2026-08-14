ALTER TYPE "public"."ProgrammeReportingStatus" ADD VALUE 'COMPLETED';--> statement-breakpoint
CREATE TABLE "category_programme_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"category_id" text NOT NULL,
	"max_stage" integer,
	"max_non_stage" integer,
	"max_all" integer,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_programme_limit" ADD CONSTRAINT "category_programme_limit_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_programme_limit" ADD CONSTRAINT "category_programme_limit_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "category_programme_limit_category_id_key" ON "category_programme_limit" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "category_programme_limit_festival_id_idx" ON "category_programme_limit" USING btree ("festival_id");