-- Add resultPdfUrl and expiredAt to festival
ALTER TABLE "festival" ADD COLUMN "resultPdfUrl" TEXT;
ALTER TABLE "festival" ADD COLUMN "expiredAt" TIMESTAMP(3);

-- CreateEnum for FestivalLifecycleEventType
CREATE TYPE "FestivalLifecycleEventType" AS ENUM ('CREATED', 'ACTIVATED', 'EXPIRED');

-- CreateTable expired_festival_result
CREATE TABLE "expired_festival_result" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "categoryName" TEXT,
    "participantName" TEXT NOT NULL,
    "position" INTEGER,
    "grade" TEXT,
    "score" DOUBLE PRECISION,
    "points" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expired_festival_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable festival_lifecycle_event
CREATE TABLE "festival_lifecycle_event" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "event" "FestivalLifecycleEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "festival_lifecycle_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expired_festival_result_festivalId_idx" ON "expired_festival_result"("festivalId");
CREATE INDEX "festival_lifecycle_event_festivalId_idx" ON "festival_lifecycle_event"("festivalId");

ALTER TABLE "expired_festival_result" ADD CONSTRAINT "expired_festival_result_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "festival_lifecycle_event" ADD CONSTRAINT "festival_lifecycle_event_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
