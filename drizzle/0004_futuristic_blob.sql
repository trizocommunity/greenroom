CREATE TYPE "public"."PosterTemplateStatus" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."PosterTemplateType" AS ENUM('RESULT', 'TEAM_POINTS', 'CANDIDATE_CARD');--> statement-breakpoint
CREATE TYPE "public"."PublicDisplayMode" AS ENUM('programme_results', 'team_standings');--> statement-breakpoint
ALTER TYPE "public"."FestivalRole" ADD VALUE 'MEDIA';--> statement-breakpoint
ALTER TYPE "public"."ProgrammeStatus" ADD VALUE 'ANNOUNCED' BEFORE 'RESET';--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "festival_scoring_award_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"scoring_policy_id" text NOT NULL,
	"criteria_type" text DEFAULT 'PARTICIPANT_RANGE' NOT NULL,
	"row_label" text,
	"programme_ids" jsonb,
	"category_id" text,
	"programme_type" "ProgrammeType",
	"min_participants" integer DEFAULT 1 NOT NULL,
	"max_participants" integer,
	"grade" text NOT NULL,
	"award_points" integer NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_scoring_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"normalize_to" integer DEFAULT 100 NOT NULL,
	"no_grade_below" integer DEFAULT 50 NOT NULL,
	"grade_rules" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judge" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgement_config" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"programme_id" text NOT NULL,
	"reporting_session_id" text NOT NULL,
	"score_limit" integer NOT NULL,
	"judging_mode" text DEFAULT 'GROUP' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgement_config_judge" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"judge_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgement_link" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"pin_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp(3),
	"bound_device_hash" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"regenerated_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "judgement_score" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"link_id" text NOT NULL,
	"judge_id" text NOT NULL,
	"code_letter_id" text NOT NULL,
	"score" double precision NOT NULL,
	"submitted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "_prisma_migrations" CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::text;--> statement-breakpoint
DROP TYPE "public"."PaymentStatus";--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED');--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"public"."PaymentStatus";--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DATA TYPE "public"."PaymentStatus" USING "status"::"public"."PaymentStatus";--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "publicDisplayMode" "PublicDisplayMode" DEFAULT 'programme_results' NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "announcerResultsPerStandings" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "announcedProgrammesSinceStandings" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "result_poster_template_code" text;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "award_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "scoring_policy_version" integer;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "isAnnounced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "announcedAt" timestamp(3);--> statement-breakpoint
ALTER TABLE "festival_poster_template" ADD CONSTRAINT "festival_poster_template_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ADD CONSTRAINT "festival_scoring_award_rule_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ADD CONSTRAINT "festival_scoring_award_rule_scoringPolicyId_fkey" FOREIGN KEY ("scoring_policy_id") REFERENCES "public"."festival_scoring_policy"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ADD CONSTRAINT "festival_scoring_award_rule_categoryId_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD CONSTRAINT "festival_scoring_policy_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judge" ADD CONSTRAINT "judge_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD CONSTRAINT "judgement_config_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD CONSTRAINT "judgement_config_programmeId_fkey" FOREIGN KEY ("programme_id") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD CONSTRAINT "judgement_config_reportingSessionId_fkey" FOREIGN KEY ("reporting_session_id") REFERENCES "public"."programme_reporting_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_config_judge" ADD CONSTRAINT "judgement_config_judge_configId_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."judgement_config"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_config_judge" ADD CONSTRAINT "judgement_config_judge_judgeId_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judge"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_link" ADD CONSTRAINT "judgement_link_configId_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."judgement_config"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_score" ADD CONSTRAINT "judgement_score_configId_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."judgement_config"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_score" ADD CONSTRAINT "judgement_score_linkId_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."judgement_link"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_score" ADD CONSTRAINT "judgement_score_judgeId_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judge"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judgement_score" ADD CONSTRAINT "judgement_score_codeLetterId_fkey" FOREIGN KEY ("code_letter_id") REFERENCES "public"."programme_code_letter"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "festival_poster_template_festivalId_code_key" ON "festival_poster_template" USING btree ("festival_id","code");--> statement-breakpoint
CREATE INDEX "festival_poster_template_festivalId_status_idx" ON "festival_poster_template" USING btree ("festival_id","status");--> statement-breakpoint
CREATE INDEX "festival_scoring_award_rule_festivalId_idx" ON "festival_scoring_award_rule" USING btree ("festival_id");--> statement-breakpoint
CREATE INDEX "festival_scoring_award_rule_scoringPolicyId_idx" ON "festival_scoring_award_rule" USING btree ("scoring_policy_id");--> statement-breakpoint
CREATE INDEX "festival_scoring_award_rule_categoryId_idx" ON "festival_scoring_award_rule" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_scoring_policy_festivalId_key" ON "festival_scoring_policy" USING btree ("festival_id");--> statement-breakpoint
CREATE INDEX "judge_festivalId_idx" ON "judge" USING btree ("festival_id");--> statement-breakpoint
CREATE INDEX "judgement_config_festivalId_idx" ON "judgement_config" USING btree ("festival_id");--> statement-breakpoint
CREATE INDEX "judgement_config_programmeId_idx" ON "judgement_config" USING btree ("programme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "judgement_config_judge_configId_judgeId_key" ON "judgement_config_judge" USING btree ("config_id","judge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "judgement_link_tokenHash_key" ON "judgement_link" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "judgement_link_configId_isActive_idx" ON "judgement_link" USING btree ("config_id","is_active");--> statement-breakpoint
CREATE INDEX "judgement_link_expiresAt_idx" ON "judgement_link" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "judgement_score_configId_judgeId_codeLetterId_key" ON "judgement_score" USING btree ("config_id","judge_id","code_letter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_festivalId_name_key" ON "category" USING btree ("festivalId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "group_festivalId_name_key" ON "group" USING btree ("festivalId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_userId_purpose_pending_unique_idx" ON "payment" USING btree ("userId","purpose") WHERE "payment"."status" = 'PENDING' AND "payment"."used" = false;--> statement-breakpoint
CREATE INDEX "programme_assignment_programmeId_teamNumber_idx" ON "programme_assignment" USING btree ("programmeId","teamNumber");--> statement-breakpoint
CREATE INDEX "programme_notification_recipientUserId_createdAt_idx" ON "programme_notification" USING btree ("recipientUserId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "programme_notification_recipientParticipantId_createdAt_idx" ON "programme_notification" USING btree ("recipientParticipantId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "result_programmeId_position_idx" ON "result" USING btree ("programmeId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_festivalId_name_key" ON "stage" USING btree ("festivalId","name");