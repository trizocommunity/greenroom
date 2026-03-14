-- Add columns to student table to match Prisma schema (chestNumber, age, standard)
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "chestNumber" TEXT;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "standard" TEXT;

-- Create unique index on (festivalId, chestNumber) if not exists (schema has @@unique)
CREATE UNIQUE INDEX IF NOT EXISTS "student_festivalId_chestNumber_key" ON "student"("festivalId", "chestNumber");
