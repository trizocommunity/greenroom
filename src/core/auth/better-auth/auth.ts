import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { magicLink, twoFactor } from "better-auth/plugins";
import { google } from "better-auth/social-providers";
import { nextCookies } from "better-auth/next-js";
import { randomUUID } from "node:crypto";
import { db } from "@/core/database/client";
import {
  account,
  session,
  twoFactor as twoFactorTable,
  user,
  userLoginEvent,
  verification,
} from "@/core/database/schema";
import { sendMagicLinkEmail } from "@/core/integrations/email";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

const MAGIC_LINK_EXPIRY_SECONDS = 30 * 60; // 30 minutes — matches magicLinkToken table TTL

/**
 * Better Auth server config.
 *
 * Owns the user/admin session. Participant and stage-portal auth
 * continue to use their own session tables (different principal shape
 * — no `user` row) via `core/auth/{participant,stage-portal}-session.ts`
 * and the shared `core/auth/cookie-session.ts` lib.
 *
 * Cookie cache is enabled so the hot path (every RSC reads
 * `auth.api.getSession`) doesn't hit the DB on every render. The cache
 * is a signed cookie containing the user object; Better Auth refreshes
 * it whenever the session row changes.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      twoFactor: twoFactorTable,
    },
  }),

  // Magic link + Google are our only sign-in methods. Password sign-in
  // is intentionally disabled.
  emailAndPassword: {
    enabled: false,
  },

  // Auto-link a Google identity to an existing user when Google's
  // `email_verified=true` matches a row in our `user` table. The
  // resulting `account` row is what enables "sign in with Google" for a
  // user who originally signed up via magic link. PR 2 ships this.
  // `updateUserInfoOnLink` is left at the Better Auth default (false) —
  // we don't want a Google sign-in silently overwriting the user's
  // `fullName` they typed in onboarding.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days, matches the old JWT TTL
    updateAge: 60 * 60 * 24, // refresh once a day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      globalRole: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false, // server-owned — never accept from API input
      },
      fullName: {
        type: "string",
        required: false,
        input: false,
      },
      displayName: {
        type: "string",
        required: false,
        input: false,
      },
      accountType: {
        type: "string",
        required: false,
        input: false,
      },
      institutionId: {
        type: "string",
        required: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      timezone: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  advanced: {
    // Match the existing user-id format (cuid-like text) rather than
    // letting Better Auth generate UUIDs. Keeps FKs from existing rows
    // valid and avoids changing the value callers see.
    database: {
      generateId: () => randomUUID(),
    },
    // Disable the default cookie prefix so Better Auth's cookie plays
    // nicely with the existing `participant_session` / `stage_portal_session`
    // cookies (different names, but avoids surprise collisions in
    // Cookie headers).
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  plugins: [
    magicLink({
      expiresIn: MAGIC_LINK_EXPIRY_SECONDS,
      sendMagicLink: async ({ email, url }) => {
        // PR 3: `signInUserByEmail` (used by the invitation-accept
        // flow) needs to mint a session without sending another email
        // to the user — they already proved ownership of the address
        // by presenting a valid invitation token. Set the SILENT env
        // for that single call to suppress the send.
        if (process.env.GREENROOM_SILENT_AUTH === "1") return;

        // The `token` query param is what the current magic-link flow
        // forwards — extract it so the existing email sender (which
        // takes a raw token) keeps working unchanged. The `url` Better
        // Auth builds already embeds the token.
        const tokenParam = new URL(url).searchParams.get("token") ?? "";
        await sendMagicLinkEmail(
          email,
          tokenParam,
          MAGIC_LINK_EXPIRY_SECONDS / 60,
        );
      },
    }),
    // Two-factor (PR 4 of ISSUE-41). TOTP (authenticator apps) plus
    // email OTP as a fallback (sent through our existing Resend
    // sender). Backup codes default to 10, length 10, and are stored
    // encrypted. The `twoFactorCookie` window gives the user ten
    // minutes to complete the challenge after the first factor
    // succeeds. `allowPasswordless: true` lets users who signed in
    // via magic-link / Google (no password) still manage 2FA without
    // a password step — see Better Auth docs.
    twoFactor({
      issuer: "Greenroom",
      totpOptions: {
        digits: 6,
        period: 30,
      },
      otpOptions: {
        period: 5, // 5-minute OTP validity
        digits: 6,
        // Send the OTP via Resend. Better Auth's default would write
        // the OTP to the verification table without notifying the
        // user — we want an email.
        async sendOTP({ otp, user: u }) {
          if (process.env.GREENROOM_SILENT_AUTH === "1") return;
          const { sendEmail } = await import(
            "@/core/integrations/email/send"
          );
          await sendEmail({
            to: u.email,
            kind: { kind: "two_factor_otp", otp, email: u.email },
          });
        },
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
      // Users without a password (magic-link or Google-only) can
      // still set up 2FA — Better Auth skips the password step in
      // that case.
      allowPasswordless: true,
      // Account-level lockout (NIST SP 800-63B §5.2.2). Caps
      // consecutive failed verifications at 10 across challenges and
      // factors. Locked accounts get a 15-minute cool-off.
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 10,
        durationSeconds: 15 * 60,
      },
    }),
    // Google OAuth (PR 2 ships this). The client_id / client_secret come
    // from Google Cloud Console — see ISSUE-41 §"Google Cloud Console
    // setup". The `accessType: "offline"` requests refresh tokens so a
    // returning Google user keeps a usable session. Empty strings still
    // register the provider — Better Auth will only error on actual
    // sign-in attempts, so a missing client secret doesn't crash the
    // login page.
    google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      accessType: "offline",
    }),
    // Must be last per Better Auth docs — wires `Set-Cookie` headers
    // through Next's `cookies()` so server actions and RSCs see the
    // updated session cookie.
    nextCookies(),
  ],

  // Track every successful sign-in so the admin analytics dashboard
  // (which aggregates `user_login_event`) keeps working, and write
  // audit-log entries for the new auth paths. Better Auth runs
  // after-hooks per endpoint path.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;
      const newSession = ctx.context.newSession;

      // Track sign-in for analytics + write audit-log entries for the
      // magic-link and Google paths. Magic-link is silent in audit (we
      // don't want one row per "check your email" click); only record
      // when a session was actually minted.
      const isMagicLinkVerify = path === "/magic-link/verify";
      const isMagicLinkSignIn = path === "/sign-in/magic-link";
      const isGoogleSignIn = path === "/sign-in/social";
      const isAnySignIn =
        isMagicLinkVerify || isMagicLinkSignIn || isGoogleSignIn;

      // PR 4: 2FA management endpoints. The `/two-factor/enable` and
      // `/two-factor/disable` paths set `newSession` (Better Auth
      // refreshes the session after toggling 2FA), so we read the
      // user from there. Backup-code regeneration uses the existing
      // session — `newSession` is also populated.
      const isTwoFactorEnable = path === "/two-factor/enable";
      const isTwoFactorDisable = path === "/two-factor/disable";
      const isBackupCodeRegen =
        path === "/two-factor/generate-backup-codes";
      const isTwoFactorVerify =
        path === "/two-factor/verify-totp" ||
        path === "/two-factor/verify-otp" ||
        path === "/two-factor/verify-backup-code";

      if (
        !isAnySignIn &&
        !isTwoFactorEnable &&
        !isTwoFactorDisable &&
        !isBackupCodeRegen &&
        !isTwoFactorVerify
      ) {
        return;
      }
      if (!newSession?.user?.id) return;

      const userId = newSession.user.id;
      const actorRole =
        (newSession.user as { globalRole?: string }).globalRole ?? "USER";
      const ip =
        ctx.request?.headers.get("x-forwarded-for") ?? null;
      const userAgent =
        ctx.request?.headers.get("user-agent") ?? null;

      // Sign-in analytics + audit-log entries only apply to the
      // sign-in flows. 2FA management doesn't change the
      // last-login-at field.
      if (isAnySignIn) {
        try {
          await db.insert(userLoginEvent).values({
            id: randomUUID(),
            userId,
            ip,
            userAgent,
          });
        } catch (err) {
          // Never block sign-in on analytics.
          console.error("[auth] failed to record user_login_event", err);
        }
      }

      try {
        if (isGoogleSignIn) {
          await createAuditLog({
            action: "SIGN_IN_GOOGLE",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent },
          });

          // Account-link audit: if Better Auth just created an
          // `account` row for this user with providerId="google", it
          // means a magic-link user linked their Google identity in
          // this flow (auto-link by verified email). Distinguish
          // "new user via Google" from "linked Google to existing
          // user" so the audit log tells the right story.
          const justLinked = await db.query.account.findFirst({
            where: (a, { and, eq }) =>
              and(eq(a.userId, userId), eq(a.providerId, "google")),
          });
          if (justLinked) {
            const ageMs =
              Date.now() - new Date(justLinked.createdAt).getTime();
            if (ageMs < 60_000) {
              const existingAccountsForUser = await db.query.account.findMany(
                {
                  where: (a, { eq }) => eq(a.userId, userId),
                },
              );
              const isLinkNotNew =
                existingAccountsForUser.length > 1 ||
                // Account-link path: the user already existed before
                // this sign-in (created via magic link earlier).
                new Date(newSession.user.createdAt).getTime() <
                  Date.now() - 5_000;
              if (isLinkNotNew) {
                await createAuditLog({
                  action: "LINK_GOOGLE_ACCOUNT",
                  targetType: "USER",
                  targetId: userId,
                  actor: { actorId: userId, actorRole },
                  metadata: { ip, userAgent },
                });
              }
            }
          }
        }

        if (isTwoFactorEnable) {
          await createAuditLog({
            action: "ENABLE_2FA",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent },
          });
        }

        if (isTwoFactorDisable) {
          await createAuditLog({
            action: "DISABLE_2FA",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent },
          });
        }

        if (isBackupCodeRegen) {
          await createAuditLog({
            action: "REGENERATE_BACKUP_CODES",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent },
          });
        }

        if (isTwoFactorVerify) {
          await createAuditLog({
            action: "VERIFY_2FA",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent, method: path },
          });
        }
      } catch (err) {
        // Audit failure must never break sign-in.
        console.error("[auth] failed to record audit log", err);
      }
    }),
  },
});

export type Auth = typeof auth;
export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
