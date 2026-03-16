-- -----------------------------------------------------------------------------
-- Analytics & Behaviour (Phase 5)
-- -----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "user_login_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "user_login_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_purchase_summary" (
    "userId" TEXT NOT NULL,
    "totalSpend" INTEGER NOT NULL DEFAULT 0,
    "festivalsCount" INTEGER NOT NULL DEFAULT 0,
    "lastPurchaseAt" TIMESTAMP(3),
    "festivalIds" JSONB,
    "planCountsByTier" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_purchase_summary_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "festival_category_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_category_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_login_event_userId_loggedAt_idx" ON "user_login_event"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "festival_category_preference_userId_idx" ON "festival_category_preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "festival_category_preference_userId_category_key" ON "festival_category_preference"("userId", "category");

-- AddForeignKey
ALTER TABLE "user_login_event" ADD CONSTRAINT "user_login_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_purchase_summary" ADD CONSTRAINT "user_purchase_summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_category_preference" ADD CONSTRAINT "festival_category_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

