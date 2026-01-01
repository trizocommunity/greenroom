/*
  Warnings:

  - The values [TEAM_LEADER] on the enum `FestivalRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `participantCreationDeadline` on the `festival` table. All the data in the column will be lost.
  - You are about to drop the column `participantsCount` on the `festival` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `festival_member` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `group` table. All the data in the column will be lost.
  - You are about to drop the column `participantId` on the `programme_assignment` table. All the data in the column will be lost.
  - You are about to drop the `participant` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[programmeId,studentId]` on the table `programme_assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FestivalRole_new" AS ENUM ('ADMIN', 'ANNOUNCER', 'STAGE_MANAGER');
ALTER TABLE "public"."festival_member" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "festival_member" ALTER COLUMN "role" TYPE "FestivalRole_new" USING ("role"::text::"FestivalRole_new");
ALTER TYPE "FestivalRole" RENAME TO "FestivalRole_old";
ALTER TYPE "FestivalRole_new" RENAME TO "FestivalRole";
DROP TYPE "public"."FestivalRole_old";
ALTER TABLE "festival_member" ALTER COLUMN "role" SET DEFAULT 'ANNOUNCER';
COMMIT;

-- DropForeignKey
ALTER TABLE "festival_member" DROP CONSTRAINT "festival_member_groupId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_festivalId_fkey";

-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_groupId_fkey";

-- DropForeignKey
ALTER TABLE "programme_assignment" DROP CONSTRAINT "programme_assignment_participantId_fkey";

-- DropIndex
DROP INDEX "programme_assignment_programmeId_participantId_key";

-- AlterTable
ALTER TABLE "festival" DROP COLUMN "participantCreationDeadline",
DROP COLUMN "participantsCount",
ADD COLUMN     "studentCreationDeadline" TIMESTAMP(3),
ADD COLUMN     "studentsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "festival_member" DROP COLUMN "groupId",
ALTER COLUMN "role" SET DEFAULT 'ANNOUNCER';

-- AlterTable
ALTER TABLE "group" DROP COLUMN "type",
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#2563eb';

-- AlterTable
ALTER TABLE "programme" ADD COLUMN     "maxTeamSize" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "programme_assignment" DROP COLUMN "participantId",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "studentId" TEXT;

-- DropTable
DROP TABLE "participant";

-- CreateTable
CREATE TABLE "student" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "registrationNumber" TEXT,
    "isTeamLeader" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_festivalId_idx" ON "student"("festivalId");

-- CreateIndex
CREATE INDEX "student_groupId_idx" ON "student"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "programme_assignment_programmeId_studentId_key" ON "programme_assignment"("programmeId", "studentId");

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_assignment" ADD CONSTRAINT "programme_assignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
