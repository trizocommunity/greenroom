-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INDIVIDUAL', 'GENERAL');

-- AlterTable
ALTER TABLE "category" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "seriesStart" INTEGER NOT NULL DEFAULT 100;
