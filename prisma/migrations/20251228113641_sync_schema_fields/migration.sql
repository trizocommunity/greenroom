/*
  Warnings:

  - You are about to drop the column `editionId` on the `participant` table. All the data in the column will be lost.
  - You are about to drop the column `editionId` on the `payment` table. All the data in the column will be lost.
  - The `status` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tier` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `editionId` on the `programme` table. All the data in the column will be lost.
  - You are about to drop the column `editionId` on the `programme_assignment` table. All the data in the column will be lost.
  - You are about to drop the `edition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `edition_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `edition_group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `edition_limit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[festivalId,email]` on the table `participant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `festivalId` to the `participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `festivalId` to the `programme` table without a default value. This is not possible if the table is not empty.
  - Added the required column `festivalId` to the `programme_assignment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BASIC', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('COLLEGE', 'MADRASA', 'SCHOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('FESTIVAL_CREATION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FestivalRole" AS ENUM ('TEAM_LEADER', 'ADMIN');

-- AlterEnum
ALTER TYPE "FestivalStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "edition" DROP CONSTRAINT "edition_festivalId_fkey";

-- DropForeignKey
ALTER TABLE "edition_category" DROP CONSTRAINT "edition_category_editionId_fkey";

-- DropForeignKey
ALTER TABLE "edition_group" DROP CONSTRAINT "edition_group_editionId_fkey";

-- DropForeignKey
ALTER TABLE "edition_limit" DROP CONSTRAINT "edition_limit_editionId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_editionId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_groupId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_editionId_fkey";

-- DropForeignKey
ALTER TABLE "programme" DROP CONSTRAINT "programme_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "programme" DROP CONSTRAINT "programme_editionId_fkey";

-- DropForeignKey
ALTER TABLE "programme_assignment" DROP CONSTRAINT "programme_assignment_editionId_fkey";

-- DropForeignKey
ALTER TABLE "programme_assignment" DROP CONSTRAINT "programme_assignment_groupId_fkey";

-- DropIndex
DROP INDEX "participant_editionId_email_key";

-- AlterTable
ALTER TABLE "festival" ADD COLUMN     "eventsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "institutionName" TEXT,
ADD COLUMN     "institutionType" "InstitutionType",
ADD COLUMN     "judgesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "participantCreationDeadline" TIMESTAMP(3),
ADD COLUMN     "participantsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "programmeAssignmentDeadline" TIMESTAMP(3),
ADD COLUMN     "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tier" "Tier" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "tierLabel" TEXT NOT NULL DEFAULT 'Standard';

-- AlterTable
ALTER TABLE "participant" DROP COLUMN "editionId",
ADD COLUMN     "festivalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "editionId",
ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'FESTIVAL_CREATION',
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "tier",
ADD COLUMN     "tier" "Tier";

-- AlterTable
ALTER TABLE "programme" DROP COLUMN "editionId",
ADD COLUMN     "festivalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "programme_assignment" DROP COLUMN "editionId",
ADD COLUMN     "festivalId" TEXT NOT NULL;

-- DropTable
DROP TABLE "edition";

-- DropTable
DROP TABLE "edition_category";

-- DropTable
DROP TABLE "edition_group";

-- DropTable
DROP TABLE "edition_limit";

-- DropEnum
DROP TYPE "EditionStatus";

-- DropEnum
DROP TYPE "EditionTier";

-- CreateTable
CREATE TABLE "festival_member" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "role" "FestivalRole" NOT NULL DEFAULT 'TEAM_LEADER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GroupType" NOT NULL DEFAULT 'SCHOOL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "festival_member_festivalId_userId_key" ON "festival_member"("festivalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "participant_festivalId_email_key" ON "participant"("festivalId", "email");

-- AddForeignKey
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme" ADD CONSTRAINT "programme_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme" ADD CONSTRAINT "programme_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
