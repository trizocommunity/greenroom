/*
  Warnings:

  - The values [INDIVIDUAL] on the enum `CategoryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CategoryType_new" AS ENUM ('SINGLE', 'GENERAL');
ALTER TABLE "public"."category" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "category" ALTER COLUMN "type" TYPE "CategoryType_new" USING (
  CASE 
    WHEN "type"::text = 'INDIVIDUAL' THEN 'SINGLE'::"CategoryType_new"
    ELSE "type"::text::"CategoryType_new"
  END
);
ALTER TYPE "CategoryType" RENAME TO "CategoryType_old";
ALTER TYPE "CategoryType_new" RENAME TO "CategoryType";
DROP TYPE "public"."CategoryType_old";
ALTER TABLE "category" ALTER COLUMN "type" SET DEFAULT 'SINGLE';
COMMIT;

-- AlterTable
ALTER TABLE "category" ALTER COLUMN "type" SET DEFAULT 'SINGLE';
