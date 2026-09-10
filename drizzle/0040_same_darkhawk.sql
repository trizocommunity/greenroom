CREATE TABLE "checkpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"requires_window" boolean DEFAULT false NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "checkpoint_scan" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"chest_number" text NOT NULL,
	"scanned_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"scanned_by_user_id" text,
	"scanned_by_name" text,
	"scanned_by_email" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoint_session" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"checkpoint_id" text NOT NULL,
	"name" text NOT NULL,
	"session_date" text NOT NULL,
	"window_start_min" integer,
	"window_end_min" integer,
	"status" "SessionStatus" DEFAULT 'OPEN' NOT NULL,
	"started_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
ALTER TABLE "checkpoint" ADD CONSTRAINT "checkpoint_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_scan" ADD CONSTRAINT "checkpoint_scan_session_id_checkpoint_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."checkpoint_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_scan" ADD CONSTRAINT "checkpoint_scan_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_session" ADD CONSTRAINT "checkpoint_session_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_session" ADD CONSTRAINT "checkpoint_session_checkpoint_id_checkpoint_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkpoint_festival_name_idx" ON "checkpoint" USING btree ("festival_id","name");--> statement-breakpoint
CREATE INDEX "checkpoint_festival_idx" ON "checkpoint" USING btree ("festival_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkpoint_scan_unique_idx" ON "checkpoint_scan" USING btree ("session_id","participant_id");--> statement-breakpoint
CREATE INDEX "checkpoint_scan_participant_idx" ON "checkpoint_scan" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "checkpoint_scan_scanned_at_idx" ON "checkpoint_scan" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "checkpoint_session_checkpoint_date_idx" ON "checkpoint_session" USING btree ("checkpoint_id","session_date");--> statement-breakpoint
CREATE INDEX "checkpoint_session_festival_date_idx" ON "checkpoint_session" USING btree ("festival_id","session_date");