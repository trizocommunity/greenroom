/*
  Warnings:

  - You are about to drop the column `name` on the `edition` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `participant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProgrammeType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('STAGE', 'NON_STAGE');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('SCHOOL', 'COLLEGE', 'MADRASA', 'OPEN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_editionId_fkey";

-- DropIndex
DROP INDEX "edition_festivalId_number_key";

-- AlterTable
ALTER TABLE "edition" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "participant" ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "groupId" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "edition_category" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edition_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProgrammeType" NOT NULL DEFAULT 'INDIVIDUAL',
    "stageType" "StageType" NOT NULL DEFAULT 'STAGE',
    "maxEntries" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edition_group" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GroupType" NOT NULL DEFAULT 'SCHOOL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edition_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_assignment" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "participantId" TEXT,
    "groupId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programme_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programme_assignment_programmeId_participantId_key" ON "programme_assignment"("programmeId", "participantId");

-- AddForeignKey
ALTER TABLE "edition_category" ADD CONSTRAINT "edition_category_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme" ADD CONSTRAINT "programme_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme" ADD CONSTRAINT "programme_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "edition_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_group" ADD CONSTRAINT "edition_group_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "edition_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "edition_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "edition_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
