-- CreateTable
CREATE TABLE "schedule_entry" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "programmeId" TEXT,
    "eventId" TEXT,
    "stageId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_entry_festivalId_idx" ON "schedule_entry"("festivalId");

-- CreateIndex
CREATE INDEX "schedule_entry_festivalId_startTime_idx" ON "schedule_entry"("festivalId", "startTime");

-- AddForeignKey
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
