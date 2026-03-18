-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('READY', 'ASSIGNED', 'SCHEDULED', 'REPORTING', 'STARTED', 'ENDED', 'JUDGED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "programme" ADD COLUMN "status" "ProgrammeStatus" NOT NULL DEFAULT 'READY';
ALTER TABLE "programme" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "programme_festivalId_status_idx" ON "programme"("festivalId", "status");
