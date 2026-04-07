-- CreateEnum
CREATE TYPE "RealtimeOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'FAILED');

-- CreateTable
CREATE TABLE "realtime_outbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "festivalId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "roomKeys" JSONB NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "sequence" INTEGER,
    "actorUserId" TEXT,
    "status" "RealtimeOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtime_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realtime_outbox_eventId_key" ON "realtime_outbox"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "realtime_outbox_eventName_idempotencyKey_key" ON "realtime_outbox"("eventName", "idempotencyKey");

-- CreateIndex
CREATE INDEX "realtime_outbox_status_nextAttemptAt_idx" ON "realtime_outbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "realtime_outbox_festivalId_createdAt_idx" ON "realtime_outbox"("festivalId", "createdAt");

-- CreateIndex
CREATE INDEX "realtime_outbox_eventName_createdAt_idx" ON "realtime_outbox"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "realtime_outbox_entityType_entityId_createdAt_idx" ON "realtime_outbox"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "realtime_outbox" ADD CONSTRAINT "realtime_outbox_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_outbox" ADD CONSTRAINT "realtime_outbox_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
