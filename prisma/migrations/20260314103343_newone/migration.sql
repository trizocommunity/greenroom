/*
  Warnings:

  - You are about to drop the column `maxEntries` on the `programme` table. All the data in the column will be lost.
  - You are about to drop the column `maxTeamSize` on the `programme` table. All the data in the column will be lost.
  - You are about to drop the column `registrationNumber` on the `student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerId]` on the table `payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "festival_gallery_image_festivalId_idx";

-- DropIndex
DROP INDEX "festival_news_festivalId_idx";

-- AlterTable
ALTER TABLE "programme" DROP COLUMN "maxEntries",
DROP COLUMN "maxTeamSize";

-- AlterTable
ALTER TABLE "student" DROP COLUMN "registrationNumber";

-- CreateIndex
CREATE INDEX "festival_status_idx" ON "festival"("status");

-- CreateIndex
CREATE INDEX "festival_expiresAt_idx" ON "festival"("expiresAt");

-- CreateIndex
CREATE INDEX "group_festivalId_createdAt_idx" ON "group"("festivalId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payment_userId_purpose_status_idx" ON "payment"("userId", "purpose", "status");

-- CreateIndex
CREATE INDEX "payment_userId_createdAt_idx" ON "payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_festivalId_idx" ON "payment"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerId_key" ON "payment"("providerId");

-- CreateIndex
CREATE INDEX "programme_festivalId_createdAt_idx" ON "programme"("festivalId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "student_festivalId_createdAt_idx" ON "student"("festivalId", "createdAt" DESC);
