import "server-only";

import crypto from "crypto";
import {
  createCookieSession,
  deleteCookieSession,
  getCookieSession,
} from "@/core/auth/cookie-session";

/**
 * Shape of a DB-backed cookie session system. The cookie and crypto
 * primitives are shared; callers only supply the cookie name, expiry,
 * and a loader that turns a token hash into a principal (or `null`).
 *
 * This lets `participant-session.ts` and `stage-portal-session.ts` become
 * thin presets over one well-tested seam. Tests can swap the loader for
 * an in-memory fake without touching cookies or crypto.
 */
export interface DbBackedCookieSessionConfig<TPrincipal> {
  cookieName: string;
  getExpiryDate: () => Date;
  loadSession: (tokenHash: string) => Promise<TPrincipal | null>;
}

export interface DbBackedCookieSession<TPrincipal> {
  cookieName: string;
  createRawSessionToken: () => string;
  getTokenHash: (rawToken: string) => string;
  getSessionExpiryDate: () => Date;
  setCookie: (rawToken: string, expiresAt: Date) => Promise<void>;
  clearCookie: () => Promise<void>;
  getCookie: () => Promise<string | undefined>;
  getSessionFromCookie: () => Promise<TPrincipal | null>;
}

function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getTokenHash(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Create a DB-backed cookie session adapter. The adapter owns the cookie
 * seam and token hashing; the loader owns the DB lookup and principal
 * shape.
 */
export function createDbBackedCookieSession<TPrincipal>(
  config: DbBackedCookieSessionConfig<TPrincipal>,
): DbBackedCookieSession<TPrincipal> {
  const { cookieName, getExpiryDate, loadSession } = config;

  return {
    cookieName,
    createRawSessionToken,
    getTokenHash,
    getSessionExpiryDate: getExpiryDate,
    setCookie: async (rawToken: string, expiresAt: Date) => {
      await createCookieSession(cookieName, rawToken, { expires: expiresAt });
    },
    clearCookie: async () => {
      await deleteCookieSession(cookieName);
    },
    getCookie: async () => {
      return getCookieSession(cookieName);
    },
    getSessionFromCookie: async () => {
      const rawToken = await getCookieSession(cookieName);
      if (!rawToken) {
        return null;
      }
      const tokenHash = getTokenHash(rawToken);
      return loadSession(tokenHash);
    },
  };
}
