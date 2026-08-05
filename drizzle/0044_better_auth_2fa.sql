-- Better Auth 2FA (ISSUE-41 PR 4)
--
-- Adds the `twoFactor` table for TOTP secrets and backup codes, plus the
-- `twoFactorEnabled` column on `user`. The 2FA plugin in
-- `src/core/auth/better-auth/auth.ts` reads/writes the column via the
-- `additionalFields` registration; this migration just makes the column
-- real.
--
-- The `twoFactor` table is created with Better Auth's default column
-- names. `secret` is indexed because Better Auth looks up rows by
-- secret during TOTP verification; `userId` is indexed for the
-- per-user lookup on enable/disable.

-- 1. New column on "user"
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false NOT NULL;

-- 2. twoFactor table — one row per user with 2FA enabled
CREATE TABLE "twoFactor" (
  "id" text PRIMARY KEY NOT NULL,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL,
  "verified" boolean DEFAULT true NOT NULL,
  "failedVerificationCount" integer DEFAULT 0,
  "lockedUntil" timestamp(3) with time zone
);
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor" ("secret");
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor" ("userId");
ALTER TABLE "twoFactor"
  ADD CONSTRAINT "twoFactor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;