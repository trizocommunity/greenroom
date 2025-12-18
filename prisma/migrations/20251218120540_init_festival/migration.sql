-- CreateTable
CREATE TABLE "FestivalMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FestivalMember_userId_idx" ON "FestivalMember"("userId");

-- CreateIndex
CREATE INDEX "FestivalMember_festivalId_idx" ON "FestivalMember"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalMember_userId_festivalId_key" ON "FestivalMember"("userId", "festivalId");

-- AddForeignKey
ALTER TABLE "FestivalMember" ADD CONSTRAINT "FestivalMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalMember" ADD CONSTRAINT "FestivalMember_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
