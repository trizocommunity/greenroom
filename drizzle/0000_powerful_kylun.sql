CREATE TYPE "public"."CategoryType" AS ENUM('SINGLE', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."FestivalLifecycleEventType" AS ENUM('CREATED', 'ACTIVATED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."FestivalRole" AS ENUM('ADMIN', 'ANNOUNCER', 'STAGE_MANAGER');--> statement-breakpoint
CREATE TYPE "public"."FestivalStatus" AS ENUM('READY', 'ONGOING', 'PAST', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."Gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."GlobalRole" AS ENUM('USER', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."GroupType" AS ENUM('SCHOOL', 'COLLEGE', 'MADRASA', 'OPEN');--> statement-breakpoint
CREATE TYPE "public"."InstitutionType" AS ENUM('COLLEGE', 'MADRASA', 'SCHOOL', 'OTHER', 'UNIVERSITY', 'INSTITUTION', 'CAMPUS');--> statement-breakpoint
CREATE TYPE "public"."PaymentPurpose" AS ENUM('FESTIVAL_CREATION');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ProgrammeNotificationEventType" AS ENUM('REPORTING_STARTED', 'REPORTING_RESET', 'REPORTING_PARTICIPANT_MARKED', 'REPORTING_CLOSED', 'CODE_LETTER_ISSUED', 'PROGRAMME_STATUS_CHANGED');--> statement-breakpoint
CREATE TYPE "public"."ProgrammeReportingStatus" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'RESET', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."ProgrammeStatus" AS ENUM('READY', 'ASSIGNED', 'SCHEDULED', 'REPORTING', 'STARTED', 'ENDED', 'JUDGED', 'PUBLISHED', 'RESET');--> statement-breakpoint
CREATE TYPE "public"."ProgrammeType" AS ENUM('INDIVIDUAL', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."RealtimeOutboxStatus" AS ENUM('PENDING', 'PROCESSING', 'DISPATCHED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ScheduleEntryType" AS ENUM('PROGRAMME', 'SESSION');--> statement-breakpoint
CREATE TYPE "public"."ScoringSystem" AS ENUM('POSITION_BASED', 'SCORE_BASED');--> statement-breakpoint
CREATE TYPE "public"."SessionType" AS ENUM('GENERAL', 'CEREMONY', 'TALK', 'CONCERT');--> statement-breakpoint
CREATE TYPE "public"."StageType" AS ENUM('STAGE', 'NON_STAGE');--> statement-breakpoint
CREATE TYPE "public"."Tier" AS ENUM('BASIC', 'STANDARD', 'PRO');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actorId" text NOT NULL,
	"actorRole" text NOT NULL,
	"action" text NOT NULL,
	"targetType" text NOT NULL,
	"targetId" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"type" "CategoryType" DEFAULT 'SINGLE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expired_festival_result" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"programmeName" text NOT NULL,
	"categoryName" text,
	"participantName" text NOT NULL,
	"position" integer,
	"grade" text,
	"score" double precision,
	"points" integer,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"description" text,
	"orgName" text,
	"orgDescription" text,
	"orgWebsite" text,
	"orgLocation" text,
	"establishedYear" integer,
	"founderName" text,
	"founderMessage" text,
	"branding" jsonb,
	"rules" jsonb,
	"structure" jsonb,
	"isLocked" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"maxResultScore" integer,
	"expiresAt" timestamp(3),
	"institutionName" text,
	"institutionType" "InstitutionType",
	"judgesCount" integer DEFAULT 0 NOT NULL,
	"location" text,
	"programmeAssignmentDeadline" timestamp(3),
	"storageUsedMb" integer DEFAULT 0 NOT NULL,
	"tier" "Tier" DEFAULT 'STANDARD' NOT NULL,
	"tierLabel" text DEFAULT 'Standard' NOT NULL,
	"participantCreationDeadline" timestamp(3),
	"participantsCount" integer DEFAULT 0 NOT NULL,
	"publicSiteEnabled" boolean DEFAULT false NOT NULL,
	"stagesCount" integer DEFAULT 0 NOT NULL,
	"startDate" timestamp(3),
	"endDate" timestamp(3),
	"programmesCount" integer DEFAULT 0 NOT NULL,
	"chestNumberSettings" jsonb,
	"teamStandings" jsonb,
	"scoringSystem" "ScoringSystem" DEFAULT 'SCORE_BASED' NOT NULL,
	"status" "FestivalStatus" DEFAULT 'READY' NOT NULL,
	"resultPdfUrl" text,
	"expiredAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "festival_category_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"category" text NOT NULL,
	"weight" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_media_image" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"url" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_lifecycle_event" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"event" "FestivalLifecycleEventType" NOT NULL,
	"occurredAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "festival_member" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "FestivalRole" DEFAULT 'ANNOUNCER' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_news" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"imageUrl" text,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"excerpt" text
);
--> statement-breakpoint
CREATE TABLE "group" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"seriesStart" integer DEFAULT 100 NOT NULL,
	"color" text DEFAULT '#2563eb' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp(3) NOT NULL,
	"userId" text NOT NULL,
	"usedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"providerId" text NOT NULL,
	"referenceId" text,
	"receipt" text,
	"validUntil" timestamp(3),
	"userId" text NOT NULL,
	"festivalId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"purpose" "PaymentPurpose" DEFAULT 'FESTIVAL_CREATION' NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"tier" "Tier"
);
--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme" (
	"id" text PRIMARY KEY NOT NULL,
	"categoryId" text NOT NULL,
	"name" text NOT NULL,
	"type" "ProgrammeType" DEFAULT 'INDIVIDUAL' NOT NULL,
	"stageType" "StageType" DEFAULT 'STAGE' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"festivalId" text NOT NULL,
	"maxParticipantsPerGroup" integer DEFAULT 1 NOT NULL,
	"maxTeamsPerGroup" integer DEFAULT 1 NOT NULL,
	"maxParticipantsPerTeam" integer DEFAULT 1 NOT NULL,
	"status" "ProgrammeStatus" DEFAULT 'READY' NOT NULL,
	"publishedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "programme_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"programmeId" text NOT NULL,
	"groupId" text,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"festivalId" text NOT NULL,
	"categoryId" text,
	"participantId" text,
	"teamNumber" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdByEmail" text,
	"createdByName" text
);
--> statement-breakpoint
CREATE TABLE "programme_code_letter" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"reportingSessionId" text NOT NULL,
	"programmeId" text NOT NULL,
	"code" text NOT NULL,
	"issuedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"issuedBy" text
);
--> statement-breakpoint
CREATE TABLE "programme_code_letter_recipient" (
	"id" text PRIMARY KEY NOT NULL,
	"codeLetterId" text NOT NULL,
	"participantId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_judge_session" (
	"id" text PRIMARY KEY NOT NULL,
	"festival_id" text NOT NULL,
	"programme_id" text NOT NULL,
	"reporting_session_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"started_at" timestamp(3) NOT NULL,
	"used_at" timestamp(3),
	"ended_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" text,
	"updated_at" timestamp(3) NOT NULL,
	"opened_at" timestamp(3),
	"open_expires_at" timestamp(3),
	"open_nonce_hash" text,
	"open_client_fingerprint_hash" text,
	"submitted_by_name" text,
	"submitted_by_contact" text,
	"submitted_by_note" text
);
--> statement-breakpoint
CREATE TABLE "programme_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"eventType" "ProgrammeNotificationEventType" NOT NULL,
	"recipientUserId" text,
	"recipientParticipantId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"channels" jsonb,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_reported_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"reportingSessionId" text NOT NULL,
	"assignmentId" text NOT NULL,
	"participantId" text,
	"groupId" text,
	"teamNumber" integer,
	"reportedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reportedBy" text
);
--> statement-breakpoint
CREATE TABLE "programme_reporting_session" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"scheduleEntryId" text NOT NULL,
	"programmeId" text NOT NULL,
	"stageId" text,
	"status" "ProgrammeReportingStatus" DEFAULT 'NOT_STARTED' NOT NULL,
	"startedAt" timestamp(3),
	"startedBy" text,
	"endedAt" timestamp(3),
	"endedBy" text,
	"windowEndsAt" timestamp(3),
	"isLocked" boolean DEFAULT false NOT NULL,
	"closedAtScheduleStart" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "realtime_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"eventName" text NOT NULL,
	"eventVersion" integer DEFAULT 1 NOT NULL,
	"festivalId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"roomKeys" jsonb NOT NULL,
	"correlationId" text,
	"idempotencyKey" text NOT NULL,
	"sequence" integer,
	"actorUserId" text,
	"status" "RealtimeOutboxStatus" DEFAULT 'PENDING' NOT NULL,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"errorMessage" text,
	"dispatchedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"programmeId" text NOT NULL,
	"assignmentId" text NOT NULL,
	"grade" text,
	"position" integer,
	"score" double precision DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"remarks" text,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"programmeId" text,
	"stageId" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3),
	"order" integer DEFAULT 0 NOT NULL,
	"createdBy" text,
	"updatedBy" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"type" "ScheduleEntryType" DEFAULT 'PROGRAMME' NOT NULL,
	"title" text,
	"description" text,
	"speakers" text,
	"sessionType" "SessionType"
);
--> statement-breakpoint
CREATE TABLE "stage" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdBy" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"groupId" text NOT NULL,
	"categoryId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"gender" "Gender" DEFAULT 'MALE' NOT NULL,
	"isTeamLeader" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"chestNumber" text,
	"age" integer,
	"standard" text,
	"profileSlug" text
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_leader_otp" (
	"id" text PRIMARY KEY NOT NULL,
	"participantId" text NOT NULL,
	"codeHash" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_leader_session" (
	"id" text PRIMARY KEY NOT NULL,
	"participantId" text NOT NULL,
	"festivalId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"revokedAt" timestamp(3),
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"globalRole" "GlobalRole" DEFAULT 'USER' NOT NULL,
	"fullName" text,
	"displayName" text,
	"age" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_login_event" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"loggedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ip" text,
	"userAgent" text
);
--> statement-breakpoint
CREATE TABLE "user_purchase_summary" (
	"userId" text PRIMARY KEY NOT NULL,
	"totalSpend" integer DEFAULT 0 NOT NULL,
	"festivalsCount" integer DEFAULT 0 NOT NULL,
	"lastPurchaseAt" timestamp(3),
	"festivalIds" jsonb,
	"planCountsByTier" jsonb,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expired_festival_result" ADD CONSTRAINT "expired_festival_result_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival" ADD CONSTRAINT "festival_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_category_preference" ADD CONSTRAINT "festival_category_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_media_image" ADD CONSTRAINT "festival_media_image_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_lifecycle_event" ADD CONSTRAINT "festival_lifecycle_event_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "festival_news" ADD CONSTRAINT "festival_news_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme" ADD CONSTRAINT "programme_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme" ADD CONSTRAINT "programme_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD CONSTRAINT "programme_code_letter_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD CONSTRAINT "programme_code_letter_reportingSessionId_fkey" FOREIGN KEY ("reportingSessionId") REFERENCES "public"."programme_reporting_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_code_letter" ADD CONSTRAINT "programme_code_letter_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ADD CONSTRAINT "programme_code_letter_recipient_codeLetterId_fkey" FOREIGN KEY ("codeLetterId") REFERENCES "public"."programme_code_letter"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_code_letter_recipient" ADD CONSTRAINT "programme_code_letter_recipient_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_judge_session" ADD CONSTRAINT "programme_judge_session_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_judge_session" ADD CONSTRAINT "programme_judge_session_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_judge_session" ADD CONSTRAINT "programme_judge_session_reporting_session_id_fkey" FOREIGN KEY ("reporting_session_id") REFERENCES "public"."programme_reporting_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_notification" ADD CONSTRAINT "programme_notification_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_notification" ADD CONSTRAINT "programme_notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_notification" ADD CONSTRAINT "programme_notification_recipientParticipantId_fkey" FOREIGN KEY ("recipientParticipantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD CONSTRAINT "programme_reported_participant_reportingSessionId_fkey" FOREIGN KEY ("reportingSessionId") REFERENCES "public"."programme_reporting_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD CONSTRAINT "programme_reported_participant_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."programme_assignment"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD CONSTRAINT "programme_reported_participant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reported_participant" ADD CONSTRAINT "programme_reported_participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ADD CONSTRAINT "programme_reporting_session_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ADD CONSTRAINT "programme_reporting_session_scheduleEntryId_fkey" FOREIGN KEY ("scheduleEntryId") REFERENCES "public"."schedule_entry"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ADD CONSTRAINT "programme_reporting_session_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "programme_reporting_session" ADD CONSTRAINT "programme_reporting_session_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."stage"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "realtime_outbox" ADD CONSTRAINT "realtime_outbox_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "realtime_outbox" ADD CONSTRAINT "realtime_outbox_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."programme_assignment"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."stage"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stage" ADD CONSTRAINT "stage_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_leader_otp" ADD CONSTRAINT "team_leader_otp_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_leader_session" ADD CONSTRAINT "team_leader_session_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_leader_session" ADD CONSTRAINT "team_leader_session_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_login_event" ADD CONSTRAINT "user_login_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_purchase_summary" ADD CONSTRAINT "user_purchase_summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "expired_festival_result_festivalId_idx" ON "expired_festival_result" USING btree ("festivalId");--> statement-breakpoint
CREATE INDEX "festival_expiresAt_idx" ON "festival" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_ownerId_key" ON "festival" USING btree ("ownerId");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_slug_key" ON "festival" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_category_preference_userId_category_key" ON "festival_category_preference" USING btree ("userId","category");--> statement-breakpoint
CREATE INDEX "festival_category_preference_userId_idx" ON "festival_category_preference" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "festival_lifecycle_event_festivalId_idx" ON "festival_lifecycle_event" USING btree ("festivalId");--> statement-breakpoint
CREATE UNIQUE INDEX "festival_member_festivalId_userId_key" ON "festival_member" USING btree ("festivalId","userId");--> statement-breakpoint
CREATE INDEX "group_festivalId_createdAt_idx" ON "group" USING btree ("festivalId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "payment_festivalId_idx" ON "payment" USING btree ("festivalId");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_providerId_key" ON "payment" USING btree ("providerId");--> statement-breakpoint
CREATE INDEX "payment_userId_createdAt_idx" ON "payment" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "payment_userId_purpose_status_idx" ON "payment" USING btree ("userId","purpose","status");--> statement-breakpoint
CREATE INDEX "programme_festivalId_createdAt_idx" ON "programme" USING btree ("festivalId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "programme_festivalId_status_idx" ON "programme" USING btree ("festivalId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_assignment_programmeId_participantId_key" ON "programme_assignment" USING btree ("programmeId","participantId");--> statement-breakpoint
CREATE INDEX "programme_code_letter_festivalId_issuedAt_idx" ON "programme_code_letter" USING btree ("festivalId","issuedAt");--> statement-breakpoint
CREATE INDEX "programme_code_letter_programmeId_idx" ON "programme_code_letter" USING btree ("programmeId");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_code_letter_reportingSessionId_code_key" ON "programme_code_letter" USING btree ("reportingSessionId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_code_letter_recipient_codeLetterId_participantId_key" ON "programme_code_letter_recipient" USING btree ("codeLetterId","participantId");--> statement-breakpoint
CREATE INDEX "programme_code_letter_recipient_participantId_idx" ON "programme_code_letter_recipient" USING btree ("participantId");--> statement-breakpoint
CREATE INDEX "programme_judge_session_open_expires_at_idx" ON "programme_judge_session" USING btree ("open_expires_at");--> statement-breakpoint
CREATE INDEX "programme_judge_session_programme_id_used_at_idx" ON "programme_judge_session" USING btree ("programme_id","used_at");--> statement-breakpoint
CREATE INDEX "programme_judge_session_reporting_session_id_idx" ON "programme_judge_session" USING btree ("reporting_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_judge_session_token_hash_key" ON "programme_judge_session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "programme_judge_session_token_hash_used_at_idx" ON "programme_judge_session" USING btree ("token_hash","used_at");--> statement-breakpoint
CREATE INDEX "programme_notification_festivalId_createdAt_idx" ON "programme_notification" USING btree ("festivalId","createdAt");--> statement-breakpoint
CREATE INDEX "programme_notification_recipientParticipantId_isRead_idx" ON "programme_notification" USING btree ("recipientParticipantId","isRead");--> statement-breakpoint
CREATE INDEX "programme_notification_recipientUserId_isRead_idx" ON "programme_notification" USING btree ("recipientUserId","isRead");--> statement-breakpoint
CREATE INDEX "programme_reported_participant_groupId_idx" ON "programme_reported_participant" USING btree ("groupId");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_reported_participant_reportingSessionId_assignmentId_" ON "programme_reported_participant" USING btree ("reportingSessionId","assignmentId");--> statement-breakpoint
CREATE INDEX "programme_reported_participant_participantId_idx" ON "programme_reported_participant" USING btree ("participantId");--> statement-breakpoint
CREATE INDEX "programme_reporting_session_festivalId_status_idx" ON "programme_reporting_session" USING btree ("festivalId","status");--> statement-breakpoint
CREATE INDEX "programme_reporting_session_programmeId_idx" ON "programme_reporting_session" USING btree ("programmeId");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_reporting_session_scheduleEntryId_key" ON "programme_reporting_session" USING btree ("scheduleEntryId");--> statement-breakpoint
CREATE INDEX "realtime_outbox_entityType_entityId_createdAt_idx" ON "realtime_outbox" USING btree ("entityType","entityId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "realtime_outbox_eventId_key" ON "realtime_outbox" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "realtime_outbox_eventName_createdAt_idx" ON "realtime_outbox" USING btree ("eventName","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "realtime_outbox_eventName_idempotencyKey_key" ON "realtime_outbox" USING btree ("eventName","idempotencyKey");--> statement-breakpoint
CREATE INDEX "realtime_outbox_festivalId_createdAt_idx" ON "realtime_outbox" USING btree ("festivalId","createdAt");--> statement-breakpoint
CREATE INDEX "realtime_outbox_status_nextAttemptAt_idx" ON "realtime_outbox" USING btree ("status","nextAttemptAt");--> statement-breakpoint
CREATE UNIQUE INDEX "result_assignmentId_key" ON "result" USING btree ("assignmentId");--> statement-breakpoint
CREATE INDEX "result_festivalId_createdAt_idx" ON "result" USING btree ("festivalId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "schedule_entry_festivalId_idx" ON "schedule_entry" USING btree ("festivalId");--> statement-breakpoint
CREATE INDEX "schedule_entry_festivalId_startTime_idx" ON "schedule_entry" USING btree ("festivalId","startTime");--> statement-breakpoint
CREATE INDEX "schedule_entry_festivalId_type_idx" ON "schedule_entry" USING btree ("festivalId","type");--> statement-breakpoint
CREATE INDEX "stage_festivalId_idx" ON "stage" USING btree ("festivalId");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_festivalId_chestNumber_key" ON "participant" USING btree ("festivalId","chestNumber");--> statement-breakpoint
CREATE INDEX "participant_festivalId_createdAt_idx" ON "participant" USING btree ("festivalId","createdAt" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "participant_festivalId_idx" ON "participant" USING btree ("festivalId");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_festivalId_profileSlug_key" ON "participant" USING btree ("festivalId","profileSlug");--> statement-breakpoint
CREATE INDEX "participant_groupId_idx" ON "participant" USING btree ("groupId");--> statement-breakpoint
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config" USING btree ("key");--> statement-breakpoint
CREATE INDEX "team_leader_otp_expiresAt_idx" ON "team_leader_otp" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "team_leader_otp_participantId_expiresAt_idx" ON "team_leader_otp" USING btree ("participantId","expiresAt");--> statement-breakpoint
CREATE INDEX "team_leader_session_expiresAt_idx" ON "team_leader_session" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "team_leader_session_festivalId_expiresAt_idx" ON "team_leader_session" USING btree ("festivalId","expiresAt");--> statement-breakpoint
CREATE INDEX "team_leader_session_participantId_expiresAt_idx" ON "team_leader_session" USING btree ("participantId","expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "team_leader_session_tokenHash_key" ON "team_leader_session" USING btree ("tokenHash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_login_event_userId_loggedAt_idx" ON "user_login_event" USING btree ("userId","loggedAt");