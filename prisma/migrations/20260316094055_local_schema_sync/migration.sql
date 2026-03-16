-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InstitutionType" ADD VALUE 'UNIVERSITY';
ALTER TYPE "InstitutionType" ADD VALUE 'INSTITUTION';
ALTER TYPE "InstitutionType" ADD VALUE 'CAMPUS';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "festival_status_idx" ON "festival"("status");
