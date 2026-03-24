-- CreateTable
CREATE TABLE "team_leader_otp" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_leader_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_leader_session" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_leader_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_leader_otp_studentId_expiresAt_idx" ON "team_leader_otp"("studentId", "expiresAt");

-- CreateIndex
CREATE INDEX "team_leader_otp_expiresAt_idx" ON "team_leader_otp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_leader_session_tokenHash_key" ON "team_leader_session"("tokenHash");

-- CreateIndex
CREATE INDEX "team_leader_session_studentId_expiresAt_idx" ON "team_leader_session"("studentId", "expiresAt");

-- CreateIndex
CREATE INDEX "team_leader_session_festivalId_expiresAt_idx" ON "team_leader_session"("festivalId", "expiresAt");

-- CreateIndex
CREATE INDEX "team_leader_session_expiresAt_idx" ON "team_leader_session"("expiresAt");

-- AddForeignKey
ALTER TABLE "team_leader_otp" ADD CONSTRAINT "team_leader_otp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leader_session" ADD CONSTRAINT "team_leader_session_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leader_session" ADD CONSTRAINT "team_leader_session_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
