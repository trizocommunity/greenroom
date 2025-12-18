-- Rename tables to lowercase to match @@map annotations
-- This migration safely renames tables without dropping data

-- Rename main tables
ALTER TABLE "User" RENAME TO "user";
ALTER TABLE "Payment" RENAME TO "payment";
ALTER TABLE "Festival" RENAME TO "festival";
ALTER TABLE "Program" RENAME TO "program";
ALTER TABLE "Team" RENAME TO "team";
ALTER TABLE "NewsItem" RENAME TO "news_item";
ALTER TABLE "GalleryImage" RENAME TO "gallery_image";
ALTER TABLE "PasswordResetToken" RENAME TO "password_reset_token";

-- Create the new FestivalMember table
CREATE TABLE "festival_member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_member_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "festival_member_userId_festivalId_key" ON "festival_member"("userId", "festivalId");

-- Create indexes
CREATE INDEX "festival_member_userId_idx" ON "festival_member"("userId");
CREATE INDEX "festival_member_festivalId_idx" ON "festival_member"("festivalId");

-- Add foreign key constraints
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "festival_member" ADD CONSTRAINT "festival_member_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
