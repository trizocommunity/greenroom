import "server-only";

import { cookies } from "next/headers";

/**
 * Shared cookie primitives for the participant and stage-portal session
 * systems. Better Auth owns the user/admin session cookie; the two custom
 * session systems below use this lib so the cookie set/get/delete shape
 * stays identical across all three.
 *
 * PR 3 of ISSUE-41 replaces the hand-rolled JWT auth with Better Auth.
 * Participant and stage-portal auth keep their own DB-backed sessions
 * because they have a different principal shape (no `user` row) and
 * short lifetimes — pulling them into Better Auth would mean a different
 * "principal" model and gain little. Centralising the cookie code here
 * means the three systems read and write cookies the same way.
 */
export interface CookieSessionOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  expires?: Date;
}

const DEFAULT_OPTIONS: Required<Omit<CookieSessionOptions, "expires">> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

/**
 * Set a session cookie. The `value` is the raw token stored in the
 * backing DB table (sha256-hashed before storage). Production sets
 * `secure: true` automatically.
 */
export async function createCookieSession(
  name: string,
  value: string,
  opts?: CookieSessionOptions,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    ...DEFAULT_OPTIONS,
    ...(opts ?? {}),
  });
}

/**
 * Read the raw cookie value for `name`, or `undefined` if absent.
 * Callers hash the value and look it up in their own DB session table.
 */
export async function getCookieSession(
  name: string,
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

/**
 * Clear the cookie. The DB row (if any) is the caller's responsibility —
 * `getParticipantSessionFromCookie` etc. will treat the missing cookie
 * as "logged out" on the next request.
 */
export async function deleteCookieSession(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
