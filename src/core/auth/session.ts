import "server-only";

import { headers } from "next/headers";
import { auth } from "@/core/auth/better-auth/auth";

/**
 * Greenroom global role. `globalRole` lives on the `user` row as a
 * `additionalField` registered in `core/auth/better-auth/auth.ts`.
 * Better Auth has no concept of roles itself — it just persists what we
 * tell it to. The audit log also uses this string verbatim, so any new
 * value would need a corresponding `AuditAction` migration.
 */
export type GlobalRole = "USER" | "SUPER_ADMIN";

/**
 * The session shape every caller already consumes: `userId` + `role` +
 * `expires`. PR 3 backs this with Better Auth instead of a hand-rolled
 * JWT — the public shape is unchanged so the 80+ read sites in
 * `src/app/api/v1/*` and `src/features/*` don't need to be touched.
 *
 * The `[key: string]: unknown` index signature is preserved so any
 * future field Better Auth's `session` object exposes can flow through
 * without a type break. We currently only set `userId` / `role` /
 * `expires`.
 */
export interface SessionPayload {
  userId: string;
  role: GlobalRole;
  expires: Date;
  [key: string]: unknown;
}

function mapGlobalRole(value: string | null | undefined): GlobalRole {
  return value === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
}

/**
 * Read the current user/admin session.
 *
 * Implementation: Better Auth's `auth.api.getSession({ headers })`
 * resolves the session cookie (`better-auth.session_token`) and returns
 * `{ user, session }`. We project that into the existing
 * `SessionPayload` shape. The session table itself is DB-backed now, so
 * this used to be a CPU-only `jwtVerify` and is now one indexed lookup
 * per request — mitigated by Better Auth's signed cookie cache
 * (`session.cookieCache: { enabled: true, maxAge: 5 * 60 }`).
 *
 * Returns `null` when no session is present, the session is expired,
 * or the user has been deactivated. Callers don't need to change.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const hdrs = await headers();
  return getSessionFromHeaders(hdrs);
}

/**
 * Same as {@link getSession} but takes the request headers explicitly.
 * Used by route handlers that already have a `Request` in hand — avoids
 * the second `headers()` call inside `next/headers` and keeps the unit
 * tests of `createHandler` testable without a Next request scope.
 */
export async function getSessionFromHeaders(
  requestHeaders: Headers,
): Promise<SessionPayload | null> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result?.user?.id) return null;
  const u = result.user as typeof result.user & {
    globalRole?: string | null;
  };
  return {
    userId: result.user.id,
    role: mapGlobalRole(u.globalRole ?? "USER"),
    expires: new Date(result.session.expiresAt),
  };
}

/**
 * Issue a session for a known user.
 *
 * Only one caller survives PR 3: `/api/v1/invitations/accept`, which
 * needs to sign a user in after we've validated their invitation
 * token (proof of email ownership — same trust model magic-link sign-in
 * already relies on). That route has the email, so it calls
 * `signInUserByEmail(email)` below rather than this function.
 *
 * For any straggler caller that still has only `(userId, role)` we
 * look up the user's email and delegate. `nextCookies` propagates the
 * resulting `Set-Cookie` to the response automatically — there's no
 * cookie call here.
 *
 * Throws when the user can't be found. Role is server-controlled via
 * the `globalRole` column, never trusted from input.
 */
export async function createSession(
  userId: string,
  _role: GlobalRole,
): Promise<void> {
  const { db } = await import("@/core/database/client");
  const { user } = await import("@/core/database/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true },
  });
  if (!dbUser?.email) {
    throw new Error(`createSession: user ${userId} has no email`);
  }
  await signInUserByEmail(dbUser.email);
}

/**
 * Mint a session for an email without sending an email. Used by
 * invitation-accept and any other flow that has proof of email
 * ownership (the invitation token, in our case).
 *
 * Approach: Better Auth's only public "issue session without password"
 * API is the magic-link path (`signInMagicLink` → `magicLinkVerify`).
 * We don't want to email the user twice, so the production
 * `sendMagicLink` hook honours `process.env.GREENROOM_SILENT_AUTH` —
 * set that env in the request scope to suppress the actual email send.
 * Read the freshly created verification row, then call
 * `magicLinkVerify` to consume it. `nextCookies` writes the session
 * cookie automatically.
 *
 * Throws if Better Auth cannot mint a session — caller should surface
 * a 500 in that case.
 */
export async function signInUserByEmail(email: string): Promise<void> {
  const hdrs = await headers();
  const normalisedEmail = email.toLowerCase().trim();

  // Step 1: emit a verification row. The sendMagicLink hook detects
  // the SILENT flag (set by the route) and skips the actual send.
  const previousSilent = process.env.GREENROOM_SILENT_AUTH;
  process.env.GREENROOM_SILENT_AUTH = "1";
  try {
    await auth.api.signInMagicLink({
      body: { email: normalisedEmail, callbackURL: "/" },
      headers: hdrs,
      asResponse: false,
    });
  } finally {
    if (previousSilent === undefined) {
      delete process.env.GREENROOM_SILENT_AUTH;
    } else {
      process.env.GREENROOM_SILENT_AUTH = previousSilent;
    }
  }

  // Step 2: locate the verification row. Better Auth stores the
  // token in `identifier` and the email inside the JSON `value`
  // column. Filter in JS for safety — the verification table is
  // small and this only runs on invitation accept.
  const { db } = await import("@/core/database/client");
  const { verification } = await import("@/core/database/schema");
  const { desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(verification)
    .orderBy(desc(verification.createdAt))
    .limit(10);
  const match = rows.find((r) => {
    try {
      const parsed = JSON.parse(r.value) as { email?: string };
      return parsed.email?.toLowerCase() === normalisedEmail;
    } catch {
      return false;
    }
  });
  if (!match) {
    throw new Error(
      `signInUserByEmail: no verification row found for ${normalisedEmail}`,
    );
  }

  // Step 3: consume the token, which mints the session and writes
  // the cookie via nextCookies.
  await auth.api.magicLinkVerify({
    query: { token: match.identifier, callbackURL: "/" },
    headers: hdrs,
    asResponse: false,
  });
}

/**
 * Clear the current session. Backed by Better Auth's `signOut`, which
 * deletes the `session` row in the DB and clears the cookie. After
 * PR 3 the JWT cookie no longer exists, so we don't need to do
 * anything else.
 */
export async function deleteSession(): Promise<void> {
  const hdrs = await headers();
  await auth.api.signOut({ headers: hdrs });
}

/**
 * Backwards-compat shim. The two routes that used to call
 * `decrypt(cookieValue)` (`manual-book`, `expired-results-pdf`) read the
 * JWT directly. They now route through `getSession()` instead, but
 * `decrypt` is still re-exported here for the slim chance another
 * caller imports it. Returns `null` — there is no JWT to verify any
 * more.
 *
 * @deprecated Use {@link getSession} instead. Kept so any straggler
 * imports keep type-checking until the next sweep.
 */
export async function decrypt(_input: string): Promise<SessionPayload | null> {
  return null;
}
