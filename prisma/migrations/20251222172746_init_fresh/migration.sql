-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "FestivalStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('ACTIVE', 'FREEZE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditionTier" AS ENUM ('BASIC', 'STANDARD', 'PRO');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "fullName" TEXT,
    "displayName" TEXT,
    "age" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "referenceId" TEXT,
    "receipt" TEXT,
    "tier" "EditionTier",
    "validUntil" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "festivalId" TEXT,
    "editionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festival" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "orgName" TEXT,
    "orgDescription" TEXT,
    "orgWebsite" TEXT,
    "orgLocation" TEXT,
    "establishedYear" INTEGER,
    "founderName" TEXT,
    "founderMessage" TEXT,
    "branding" JSONB,
    "rules" JSONB,
    "structure" JSONB,
    "status" "FestivalStatus" NOT NULL DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edition" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "slug" TEXT NOT NULL,
    "tier" "EditionTier" NOT NULL DEFAULT 'STANDARD',
    "tierLabel" TEXT NOT NULL DEFAULT 'Standard',
    "status" "EditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "venue" TEXT,
    "location" TEXT,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "judgesCount" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
    "createdByPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "registrationNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edition_limit" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 1000,
    "maxEvents" INTEGER NOT NULL DEFAULT 100,
    "maxJudges" INTEGER NOT NULL DEFAULT 50,
    "maxStorageMB" INTEGER NOT NULL DEFAULT 1024,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edition_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "festival_ownerId_key" ON "festival"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "festival_slug_key" ON "festival"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "edition_festivalId_number_key" ON "edition"("festivalId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "edition_festivalId_slug_key" ON "edition"("festivalId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "participant_editionId_email_key" ON "participant"("editionId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "edition_limit_editionId_key" ON "edition_limit"("editionId");

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival" ADD CONSTRAINT "festival_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition" ADD CONSTRAINT "edition_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_limit" ADD CONSTRAINT "edition_limit_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
