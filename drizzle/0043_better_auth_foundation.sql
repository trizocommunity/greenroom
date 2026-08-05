-- Better Auth foundation (ISSUE-41 PR 1)
--
-- Adds the three Better Auth tables (session, account, verification),
-- adds three columns to "user" (name, image, emailVerified), and
-- backfills existing rows so the new code path is consistent from day one.
--
-- The `magicLinkToken` table is kept for now — PR 3 drops it once the
-- old JWT auth path is gone. See ISSUE-41.

-- 1. New columns on "user"
ALTER TABLE "user" ADD COLUMN "name" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "image" text;
ALTER TABLE "user" ADD COLUMN "emailVerified" boolean DEFAULT false NOT NULL;

-- 2. Backfill existing rows
--    `name`: Better Auth requires this column. Reuse fullName when set,
--    otherwise the local part of the email (mirrors what the auth UI
--    shows in the magic-link flow today).
--    `emailVerified`: every existing user has signed in via magic link
--    at least once, so they are verified.
UPDATE "user"
SET
  "name" = COALESCE("fullName", split_part("email", '@', 1)),
  "emailVerified" = TRUE;

-- 3. session table — one row per (user, device). Revocable.
CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "token" text NOT NULL,
  "expiresAt" timestamp(3) with time zone NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX "session_token_key" ON "session" ("token");
CREATE INDEX "session_userId_idx" ON "session" ("userId");
ALTER TABLE "session"
  ADD CONSTRAINT "session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 4. account table — one row per linked identity per user
CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "accessTokenExpiresAt" timestamp(3) with time zone,
  "refreshTokenExpiresAt" timestamp(3) with time zone,
  "scope" text,
  "idToken" text,
  "password" text,
  "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "account_userId_idx" ON "account" ("userId");
ALTER TABLE "account"
  ADD CONSTRAINT "account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 5. verification table — magic-link OTPs, email verifications, etc.
CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp(3) with time zone NOT NULL,
  "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");