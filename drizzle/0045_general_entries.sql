CREATE TABLE IF NOT EXISTS "general_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "general_entry_award" (
	"id" text PRIMARY KEY NOT NULL,
	"general_entry_id" text NOT NULL,
	"group_id" text NOT NULL,
	"points" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp (3) with time zone,
	"published_by_name" text,
	"published_by_email" text,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "general_entry_category" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "general_entry" ADD CONSTRAINT "general_entry_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "general_entry" ADD CONSTRAINT "general_entry_category_id_general_entry_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."general_entry_category"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "general_entry_award" ADD CONSTRAINT "general_entry_award_general_entry_id_general_entry_id_fk" FOREIGN KEY ("general_entry_id") REFERENCES "public"."general_entry"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "general_entry_award" ADD CONSTRAINT "general_entry_award_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "general_entry_category" ADD CONSTRAINT "general_entry_category_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_entry_festivalId_createdAt_idx" ON "general_entry" USING btree ("festival_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "general_entry_award_generalEntryId_groupId_key" ON "general_entry_award" USING btree ("general_entry_id","group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_entry_award_groupId_isPublished_idx" ON "general_entry_award" USING btree ("group_id","is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_entry_award_generalEntryId_idx" ON "general_entry_award" USING btree ("general_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "general_entry_category_festivalId_name_key" ON "general_entry_category" USING btree ("festival_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_entry_category_festivalId_idx" ON "general_entry_category" USING btree ("festival_id");
