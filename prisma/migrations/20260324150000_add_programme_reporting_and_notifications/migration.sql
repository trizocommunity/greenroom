-- Create enums
CREATE TYPE "ProgrammeReportingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'RESET', 'CLOSED');
CREATE TYPE "ProgrammeNotificationEventType" AS ENUM (
  'REPORTING_STARTED',
  'REPORTING_RESET',
  'REPORTING_PARTICIPANT_MARKED',
  'REPORTING_CLOSED',
  'CODE_LETTER_ISSUED',
  'PROGRAMME_STATUS_CHANGED'
);

-- Create reporting session table
CREATE TABLE "programme_reporting_session" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "scheduleEntryId" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "stageId" TEXT,
  "status" "ProgrammeReportingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" TIMESTAMP(3),
  "startedBy" TEXT,
  "endedAt" TIMESTAMP(3),
  "endedBy" TEXT,
  "windowEndsAt" TIMESTAMP(3),
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "closedAtScheduleStart" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "programme_reporting_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programme_reporting_session_scheduleEntryId_key"
  ON "programme_reporting_session"("scheduleEntryId");
CREATE INDEX "programme_reporting_session_festivalId_status_idx"
  ON "programme_reporting_session"("festivalId", "status");
CREATE INDEX "programme_reporting_session_programmeId_idx"
  ON "programme_reporting_session"("programmeId");

ALTER TABLE "programme_reporting_session"
  ADD CONSTRAINT "programme_reporting_session_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_reporting_session"
  ADD CONSTRAINT "programme_reporting_session_scheduleEntryId_fkey"
  FOREIGN KEY ("scheduleEntryId") REFERENCES "schedule_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_reporting_session"
  ADD CONSTRAINT "programme_reporting_session_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_reporting_session"
  ADD CONSTRAINT "programme_reporting_session_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reported participants
CREATE TABLE "programme_reported_participant" (
  "id" TEXT NOT NULL,
  "reportingSessionId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT,
  "groupId" TEXT,
  "teamNumber" INTEGER,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedBy" TEXT,
  CONSTRAINT "programme_reported_participant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programme_reported_participant_reportingSessionId_assignmentId_key"
  ON "programme_reported_participant"("reportingSessionId", "assignmentId");
CREATE INDEX "programme_reported_participant_studentId_idx"
  ON "programme_reported_participant"("studentId");
CREATE INDEX "programme_reported_participant_groupId_idx"
  ON "programme_reported_participant"("groupId");

ALTER TABLE "programme_reported_participant"
  ADD CONSTRAINT "programme_reported_participant_reportingSessionId_fkey"
  FOREIGN KEY ("reportingSessionId") REFERENCES "programme_reporting_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_reported_participant"
  ADD CONSTRAINT "programme_reported_participant_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "programme_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_reported_participant"
  ADD CONSTRAINT "programme_reported_participant_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programme_reported_participant"
  ADD CONSTRAINT "programme_reported_participant_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Code letters
CREATE TABLE "programme_code_letter" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "reportingSessionId" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedBy" TEXT,
  CONSTRAINT "programme_code_letter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programme_code_letter_code_key"
  ON "programme_code_letter"("code");
CREATE INDEX "programme_code_letter_festivalId_issuedAt_idx"
  ON "programme_code_letter"("festivalId", "issuedAt");
CREATE INDEX "programme_code_letter_programmeId_idx"
  ON "programme_code_letter"("programmeId");

ALTER TABLE "programme_code_letter"
  ADD CONSTRAINT "programme_code_letter_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_code_letter"
  ADD CONSTRAINT "programme_code_letter_reportingSessionId_fkey"
  FOREIGN KEY ("reportingSessionId") REFERENCES "programme_reporting_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_code_letter"
  ADD CONSTRAINT "programme_code_letter_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "programme_code_letter_recipient" (
  "id" TEXT NOT NULL,
  "codeLetterId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "programme_code_letter_recipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programme_code_letter_recipient_codeLetterId_studentId_key"
  ON "programme_code_letter_recipient"("codeLetterId", "studentId");
CREATE INDEX "programme_code_letter_recipient_studentId_idx"
  ON "programme_code_letter_recipient"("studentId");

ALTER TABLE "programme_code_letter_recipient"
  ADD CONSTRAINT "programme_code_letter_recipient_codeLetterId_fkey"
  FOREIGN KEY ("codeLetterId") REFERENCES "programme_code_letter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_code_letter_recipient"
  ADD CONSTRAINT "programme_code_letter_recipient_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications
CREATE TABLE "programme_notification" (
  "id" TEXT NOT NULL,
  "festivalId" TEXT NOT NULL,
  "eventType" "ProgrammeNotificationEventType" NOT NULL,
  "recipientUserId" TEXT,
  "recipientStudentId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "channels" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "programme_notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "programme_notification_festivalId_createdAt_idx"
  ON "programme_notification"("festivalId", "createdAt");
CREATE INDEX "programme_notification_recipientUserId_isRead_idx"
  ON "programme_notification"("recipientUserId", "isRead");
CREATE INDEX "programme_notification_recipientStudentId_isRead_idx"
  ON "programme_notification"("recipientStudentId", "isRead");

ALTER TABLE "programme_notification"
  ADD CONSTRAINT "programme_notification_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_notification"
  ADD CONSTRAINT "programme_notification_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_notification"
  ADD CONSTRAINT "programme_notification_recipientStudentId_fkey"
  FOREIGN KEY ("recipientStudentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
