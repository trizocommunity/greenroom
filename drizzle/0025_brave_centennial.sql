CREATE TYPE "public"."DurationMode" AS ENUM('SEQUENTIAL', 'PARALLEL');--> statement-breakpoint
CREATE TYPE "public"."ExportFormat" AS ENUM('PDF', 'CSV');--> statement-breakpoint
CREATE TYPE "public"."ExportStatus" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ExportType" AS ENUM('CALL_LIST', 'RESULTS', 'TEAM_RESULT', 'JUDGE_LIST', 'VALUATION_SHEET', 'BADGE', 'CERTIFICATE');--> statement-breakpoint
CREATE TYPE "public"."SessionStatus" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."TemplateAssignmentKind" AS ENUM('RESULT_RANGE', 'CERTIFICATE_TYPE', 'BADGE', 'TEAM_POINTS');--> statement-breakpoint
ALTER TYPE "public"."FestivalLifecycleEventType" ADD VALUE 'EXPIRATION_WARNING';--> statement-breakpoint
ALTER TYPE "public"."FestivalRole" ADD VALUE 'VOLUNTEER';--> statement-breakpoint
ALTER TYPE "public"."PosterTemplateType" ADD VALUE 'CERTIFICATE';--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp(3) with time zone,
	"refreshTokenExpiresAt" timestamp(3) with time zone,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_export" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"type" "ExportType" NOT NULL,
	"format" "ExportFormat" NOT NULL,
	"status" "ExportStatus" DEFAULT 'PROCESSING' NOT NULL,
	"summary" text NOT NULL,
	"config" jsonb NOT NULL,
	"fileName" text,
	"fileData" text,
	"fileSizeBytes" integer,
	"mimeType" text,
	"itemCount" integer,
	"errorMessage" text,
	"createdBy" text NOT NULL,
	"created_by_name" text,
	"created_by_email" text,
	"queuedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3) with time zone,
	"completedInMs" integer,
	"expiresAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_media_video" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"url" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_template_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"template_code" text NOT NULL,
	"assignment_kind" "TemplateAssignmentKind" NOT NULL,
	"from_result_no" integer,
	"to_result_no" integer,
	"certificate_type" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_hall_entry" (
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
CREATE TABLE "food_hall_session" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"slot_id" text NOT NULL,
	"session_date" text NOT NULL,
	"status" "SessionStatus" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_hall_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"slot_order" integer NOT NULL,
	"name" text NOT NULL,
	"window_start_min" integer NOT NULL,
	"window_end_min" integer NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "general_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text,
	"type" text DEFAULT 'GENERAL' NOT NULL,
	"remarks" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "general_entry_award" (
	"id" text PRIMARY KEY NOT NULL,
	"general_entry_id" text NOT NULL,
	"group_id" text NOT NULL,
	"points" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp(3) with time zone,
	"published_by_name" text,
	"published_by_email" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "general_entry_category" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_name" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "programme_assignment_member" (
	"id" text PRIMARY KEY NOT NULL,
	"assignmentId" text NOT NULL,
	"participantId" text NOT NULL,
	"festivalId" text NOT NULL,
	"assignedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdByEmail" text,
	"createdByName" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp(3) with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_portal_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"access_code" text NOT NULL,
	"pin_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_portal_session" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_id" text NOT NULL,
	"festival_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp(3) with time zone NOT NULL,
	"revoked_at" timestamp(3) with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twoFactor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"userId" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"failedVerificationCount" integer DEFAULT 0,
	"lockedUntil" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) with time zone NOT NULL,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expired_festival_manual_book" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expired_festival_result" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "judgement_link" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "programme_judge_session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "expired_festival_manual_book" CASCADE;--> statement-breakpoint
DROP TABLE "expired_festival_result" CASCADE;--> statement-breakpoint
DROP TABLE "judgement_link" CASCADE;--> statement-breakpoint
DROP TABLE "programme_judge_session" CASCADE;--> statement-breakpoint
ALTER TABLE "judgement_score" DROP CONSTRAINT "judgement_score_linkId_fkey";
--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
DROP TYPE "public"."ProgrammeStatus";--> statement-breakpoint
CREATE TYPE "public"."ProgrammeStatus" AS ENUM('DRAFT', 'ASSIGNED', 'SCHEDULED', 'REPORTING', 'PENDING_JUDGMENT', 'JUDGING', 'PENDING_PUBLICATION', 'PUBLISHED', 'ANNOUNCED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."ProgrammeStatus";--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "status" SET DATA TYPE "public"."ProgrammeStatus" USING "status"::"public"."ProgrammeStatus";--> statement-breakpoint
DROP INDEX "festival_ownerId_key";--> statement-breakpoint
DROP INDEX "programme_reporting_session_scheduleEntryId_key";--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "programmeAssignmentDeadline" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "participantCreationDeadline" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "startDate" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "endDate" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ALTER COLUMN "expiredAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_category_preference" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_category_preference" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_media_image" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_media_image" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_media_image" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_media_image" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_lifecycle_event" ALTER COLUMN "occurredAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_lifecycle_event" ALTER COLUMN "occurredAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_member" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_member" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_member" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_member" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_news" ALTER COLUMN "publishedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_news" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_news" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_news" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_news" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_poster_template" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_poster_template" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_poster_template" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_poster_template" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_scoring_award_rule" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "group" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "group" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "group" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "group" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "institution" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "institution" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "institution" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "institution" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judge" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judge" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judge" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judge" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judge_stage_assignment" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judge_stage_assignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judgement_config" ALTER COLUMN "status" SET DEFAULT 'LIVE';--> statement-breakpoint
ALTER TABLE "judgement_config" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_config" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judgement_config" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_config" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judgement_config_judge" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_config_judge" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judgement_score" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_score" ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "judgement_score" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_score" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "magic_link_token" ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "magic_link_token" ALTER COLUMN "usedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "magic_link_token" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "magic_link_token" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "consumedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_otp" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "revokedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant_session" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "validUntil" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "pending_invitation" ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "pending_invitation" ALTER COLUMN "acceptedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "pending_invitation" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "pending_invitation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme" ALTER COLUMN "publishedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "assignedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "assignedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_assignment" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ALTER COLUMN "issuedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ALTER COLUMN "issuedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_notification" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_notification" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ALTER COLUMN "reportedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ALTER COLUMN "reportedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "scheduleEntryId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "startedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "endedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "windowEndsAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "appointedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "appointedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_team_lead" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "schedule_entry" ALTER COLUMN "startTime" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "schedule_entry" ALTER COLUMN "endTime" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "schedule_entry" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "schedule_entry" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "schedule_entry" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "stage_manager_assignment" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "stage_manager_assignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "dateOfBirth" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "participant" ALTER COLUMN "dateOfBirth" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "user_login_event" ALTER COLUMN "loggedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user_login_event" ALTER COLUMN "loggedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "user_purchase_summary" ALTER COLUMN "lastPurchaseAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user_purchase_summary" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user_purchase_summary" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "foodHallSettings" jsonb;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "festivalExpiringSoonEmailSentAt" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "programmeAssignmentStartDate" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "participantCreationStartDate" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "queued_team_standings" jsonb;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "standings_published_at_result_number" integer;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "standings_published_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "standings_announced_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "festival" ADD COLUMN "archivedAt" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "festival_news" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "festival_news" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD COLUMN "position_points_1st" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD COLUMN "position_points_2nd" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD COLUMN "position_points_3rd" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "judge" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "judge" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "started_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "started_by" text;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "ended_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "ended_by" text;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "judgement_config" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "judgement_score" ADD COLUMN "remark" text;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "name_secondary" text;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "duration_mode" "DurationMode" DEFAULT 'SEQUENTIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "time_per_unit_minutes" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "parallel_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "programme" ADD COLUMN "result_number" integer;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "is_absent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "absent_by" text;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD COLUMN "absent_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ADD COLUMN "assignmentMemberId" text;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD COLUMN "assignmentMemberId" text;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "stage" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "stage" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "stage" ADD COLUMN "is_off_stage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "emailVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_export" ADD CONSTRAINT "festival_export_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_export" ADD CONSTRAINT "festival_export_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_media_video" ADD CONSTRAINT "festival_media_video_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_template_assignment" ADD CONSTRAINT "festival_template_assignment_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "food_hall_entry" ADD CONSTRAINT "food_hall_entry_session_id_food_hall_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."food_hall_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_hall_entry" ADD CONSTRAINT "food_hall_entry_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_hall_session" ADD CONSTRAINT "food_hall_session_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_hall_session" ADD CONSTRAINT "food_hall_session_slot_id_food_hall_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."food_hall_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_hall_slot" ADD CONSTRAINT "food_hall_slot_festival_id_festival_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_entry" ADD CONSTRAINT "general_entry_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "general_entry" ADD CONSTRAINT "general_entry_categoryId_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."general_entry_category"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "general_entry_award" ADD CONSTRAINT "general_entry_award_generalEntryId_fkey" FOREIGN KEY ("general_entry_id") REFERENCES "public"."general_entry"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "general_entry_award" ADD CONSTRAINT "general_entry_award_groupId_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "general_entry_category" ADD CONSTRAINT "general_entry_category_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment_member" ADD CONSTRAINT "programme_assignment_member_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."programme_assignment"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment_member" ADD CONSTRAINT "programme_assignment_member_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment_member" ADD CONSTRAINT "programme_assignment_member_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_portal_credential" ADD CONSTRAINT "stage_portal_credential_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_portal_credential" ADD CONSTRAINT "stage_portal_credential_stageId_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_portal_session" ADD CONSTRAINT "stage_portal_session_festivalId_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage_portal_session" ADD CONSTRAINT "stage_portal_session_stageId_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "festival_export_festivalId_queuedAt_idx" ON "festival_export" USING btree ("festivalId","queuedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "festival_export_expiresAt_idx" ON "festival_export" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "festival_template_assignment_festivalId_idx" ON "festival_template_assignment" USING btree ("festival_id");--> statement-breakpoint
CREATE UNIQUE INDEX "food_hall_entry_unique_idx" ON "food_hall_entry" USING btree ("session_id","participant_id");--> statement-breakpoint
CREATE INDEX "food_hall_entry_participant_idx" ON "food_hall_entry" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "food_hall_entry_scanned_at_idx" ON "food_hall_entry" USING btree ("scanned_at");--> statement-breakpoint
CREATE UNIQUE INDEX "food_hall_session_unique_idx" ON "food_hall_session" USING btree ("festival_id","slot_id","session_date");--> statement-breakpoint
CREATE INDEX "food_hall_session_festival_date_idx" ON "food_hall_session" USING btree ("festival_id","session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "food_hall_slot_festival_order_idx" ON "food_hall_slot" USING btree ("festival_id","slot_order");--> statement-breakpoint
CREATE INDEX "general_entry_festivalId_createdAt_idx" ON "general_entry" USING btree ("festival_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "general_entry_award_generalEntryId_groupId_key" ON "general_entry_award" USING btree ("general_entry_id","group_id");--> statement-breakpoint
CREATE INDEX "general_entry_award_groupId_isPublished_idx" ON "general_entry_award" USING btree ("group_id","is_published");--> statement-breakpoint
CREATE INDEX "general_entry_award_generalEntryId_idx" ON "general_entry_award" USING btree ("general_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "general_entry_category_festivalId_name_key" ON "general_entry_category" USING btree ("festival_id","name");--> statement-breakpoint
CREATE INDEX "general_entry_category_festivalId_idx" ON "general_entry_category" USING btree ("festival_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_assignment_member_assignmentId_participantId_key" ON "programme_assignment_member" USING btree ("assignmentId","participantId");--> statement-breakpoint
CREATE INDEX "programme_assignment_member_assignmentId_idx" ON "programme_assignment_member" USING btree ("assignmentId");--> statement-breakpoint
CREATE INDEX "programme_assignment_member_participantId_idx" ON "programme_assignment_member" USING btree ("participantId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_portal_credential_stageId_key" ON "stage_portal_credential" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_portal_credential_festivalId_accessCode_key" ON "stage_portal_credential" USING btree ("festival_id","access_code");--> statement-breakpoint
CREATE INDEX "stage_portal_session_expiresAt_idx" ON "stage_portal_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stage_portal_session_festivalId_expiresAt_idx" ON "stage_portal_session" USING btree ("festival_id","expires_at");--> statement-breakpoint
CREATE INDEX "stage_portal_session_stageId_expiresAt_idx" ON "stage_portal_session" USING btree ("stage_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_portal_session_tokenHash_key" ON "stage_portal_session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ADD CONSTRAINT "programme_code_letter_recipient_assignmentMemberId_fkey" FOREIGN KEY ("assignmentMemberId") REFERENCES "public"."programme_assignment_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD CONSTRAINT "programme_reported_participant_assignmentMemberId_fkey" FOREIGN KEY ("assignmentMemberId") REFERENCES "public"."programme_assignment_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "festival_archivedAt_idx" ON "festival" USING btree ("archivedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_ownerId_active_key" ON "festival" USING btree ("ownerId") WHERE "festival"."status" <> 'EXPIRED';--> statement-breakpoint
CREATE UNIQUE INDEX "programme_festivalId_resultNumber_key" ON "programme" USING btree ("festivalId","result_number") WHERE "programme"."result_number" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "programme_assignment_programmeId_groupId_teamNumber_key" ON "programme_assignment" USING btree ("programmeId","groupId","teamNumber") WHERE "programme_assignment"."groupId" is not null;--> statement-breakpoint
CREATE INDEX "programme_reported_participant_assignmentMemberId_idx" ON "programme_reported_participant" USING btree ("assignmentMemberId");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_reporting_session_festivalId_programmeId_key" ON "programme_reporting_session" USING btree ("festivalId","programmeId");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_festivalId_isOffStage_key" ON "stage" USING btree ("festivalId") WHERE "stage"."is_off_stage" = true;--> statement-breakpoint
ALTER TABLE "festival" DROP COLUMN "publicDisplayMode";--> statement-breakpoint
ALTER TABLE "festival" DROP COLUMN "announcerResultsPerStandings";--> statement-breakpoint
ALTER TABLE "festival" DROP COLUMN "announcedProgrammesSinceStandings";--> statement-breakpoint
ALTER TABLE "festival_scoring_policy" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "judgement_config" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "judgement_score" DROP COLUMN "link_id";--> statement-breakpoint
ALTER TABLE "programme" DROP COLUMN "result_poster_template_code";--> statement-breakpoint
ALTER TABLE "result" DROP COLUMN "isAnnounced";--> statement-breakpoint
ALTER TABLE "result" DROP COLUMN "announcedAt";--> statement-breakpoint
ALTER TABLE "result" DROP COLUMN "announced_by_email";--> statement-breakpoint
ALTER TABLE "result" DROP COLUMN "announced_by_name";--> statement-breakpoint
ALTER TABLE "schedule_entry" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "stage" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "participant" DROP COLUMN "age";