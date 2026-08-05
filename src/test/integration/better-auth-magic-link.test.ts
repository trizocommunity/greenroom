/**
 * Integration test: Better Auth magic-link flow end-to-end against a real
 * Postgres (testcontainers). Covers PR 1 of ISSUE-41.
 *
 * Verifies that:
 *   1. `auth.api.signInMagicLink` writes a row to the `verification`
 *      table.
 *   2. `auth.api.magicLinkVerify` with the returned token creates a
 *      user row + a session row, and marks `emailVerified=true`.
 *
 * The `resend` HTTP client is mocked in `src/test/setup.ts` so no email
 * is actually sent — only the call into `sendMagicLinkEmail` is exercised.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth } from "@/core/auth/better-auth/auth";
import {
  account,
  session as sessionTable,
  user as userTable,
  verification,
} from "@/core/database/schema";
import { getConnectionUri, getDb } from "./setup";

const TEST_ORIGIN = "http://localhost:3000";
const TEST_EMAIL = "better-auth-magic-link@example.com";

beforeAll(() => {
  // The shared `setup.ts` already exported the testcontainers URL into
  // `process.env.DATABASE_URL` via its own beforeAll. We layer the
  // Better Auth-specific env vars on top.
  process.env.BETTER_AUTH_SECRET = "integration-test-secret-do-not-use";
  process.env.BETTER_AUTH_URL = TEST_ORIGIN;
  process.env.BETTER_AUTH_TRUSTED_ORIGINS = TEST_ORIGIN;
  // Safety net in case the integration setup ran before this file.
  process.env.DATABASE_URL ??= getConnectionUri();
});

afterAll(async () => {
  const db = getDb();
  await db.delete(sessionTable).where(eq(userTable.email, TEST_EMAIL));
  await db.delete(userTable).where(eq(userTable.email, TEST_EMAIL));
  await db.execute(`DELETE FROM "verification"`);
});

describe("Better Auth magic-link (ISSUE-41 PR 1)", () => {
  it(
    "send → verify creates user + session against real Postgres",
    async () => {
      const db = getDb();

      // 1. Send magic link.
      const sendResult = await auth.api.signInMagicLink({
        body: { email: TEST_EMAIL, callbackURL: "/profile" },
        headers: new Headers({ origin: TEST_ORIGIN }),
        asResponse: false,
      });
      expect(sendResult).toMatchObject({ status: true });

      // Better Auth stores the verification row under the token
      // (storeToken="plain"), not under the email. Read all rows
      // created during this test and find the one for our email.
      const verificationRows = await db
        .select()
        .from(verification)
        .orderBy(verification.createdAt);
      const ours = verificationRows
        .filter((r) => {
          try {
            const parsed = JSON.parse(r.value) as { email?: string };
            return parsed.email === TEST_EMAIL;
          } catch {
            return false;
          }
        })
        .at(-1);
      expect(ours).toBeDefined();
      if (!ours) throw new Error("verification row missing");
      const tokenValue = JSON.parse(ours.value) as { email: string };
      expect(tokenValue.email).toBe(TEST_EMAIL);

      // 2. Verify with the token. We deliberately omit `callbackURL`
      // — when present, Better Auth's `magicLinkVerify` throws a
      // `ctx.redirect(...)` (302 to the callback) instead of returning
      // JSON, which is awkward to assert against. The schema side
      // effects below are what we're really verifying.
      const token = ours.identifier;
      const verifyResult = await auth.api.magicLinkVerify({
        query: { token },
        headers: new Headers({ origin: TEST_ORIGIN }),
        asResponse: false,
      });

      // User row exists, email is verified.
      const userRows = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, TEST_EMAIL))
        .limit(1);
      expect(userRows).toHaveLength(1);
      const createdUser = userRows[0]!;
      expect(createdUser.emailVerified).toBe(true);
      expect(createdUser.name).toBeDefined();

      // Session row exists and is not expired.
      const sessionRows = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, createdUser.id))
        .limit(1);
      expect(sessionRows).toHaveLength(1);
      expect(new Date(sessionRows[0]!.expiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );

      // No account row — magic-link doesn't create one.
      const accountRows = await db
        .select()
        .from(account)
        .where(eq(account.userId, createdUser.id));
      expect(accountRows).toHaveLength(0);

      // Verification row was consumed.
      const remaining = await db
        .select()
        .from(verification)
        .where(eq(verification.identifier, token));
      expect(remaining).toHaveLength(0);

      // Better Auth throws ctx.redirect on success (302 to callbackURL).
      // Either we got the redirect, or asResponse:false returned JSON.
      // Either way the side effects above are the truth.
      expect(verifyResult).toBeDefined();
    },
    60_000,
  );
});
