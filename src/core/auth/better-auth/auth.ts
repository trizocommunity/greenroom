import "server-only";

import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { db } from "@/core/database/client";
import {
  account,
  session,
  twoFactor as twoFactorTable,
  user,
  userLoginEvent,
  verification,
} from "@/core/database/schema";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

const SIGN_IN_OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes — matches two_factor_otp
const SIGN_IN_OTP_DIGITS = 4; // user override (Locked Decision #1)
const SIGN_IN_OTP_ATTEMPTS = 3; // Locked Decision #7

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

  // Google OAuth (PR 2 ships this). Social providers are NOT plugins —
  // they live on the top-level `socialProviders` option so Better Auth
  // can register them with the sign-in/social handler. Putting `google`
  // in `plugins` is silently ignored and surfaces as a 404 with
  // "Provider not found" on the client. The `client_id` / `client_secret`
  // come from Google Cloud Console — see ISSUE-41 §"Google Cloud Console
  // setup". `accessType: "offline"` requests refresh tokens so a
  // returning Google user keeps a usable session. Empty strings still
  // register the provider — Better Auth will only error on actual
  // sign-in attempts, so a missing client secret doesn't crash the
  // login page.
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      accessType: "offline",
    },
  },

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
    // ISSUE-42 (replaces magic-link): sign-in is now a 4-digit email OTP
    // — paste-friendly (`autocomplete="one-time-code"`), 5-minute window,
    // 3 attempts per code, hashed at rest (`storeOTP: "hashed"` — Locked
    // Decision #2). The hook respects `GREENROOM_SILENT_AUTH` so
    // `signInUserByEmail` (invitation-accept) can mint a session
    // without re-emailing the user.
    emailOTP({
      otpLength: SIGN_IN_OTP_DIGITS,
      expiresIn: SIGN_IN_OTP_EXPIRY_SECONDS,
      allowedAttempts: SIGN_IN_OTP_ATTEMPTS,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        if (process.env.GREENROOM_SILENT_AUTH === "1") return;
        const { sendEmail } = await import("@/core/integrations/email/send");
        await sendEmail({
          to: email,
          kind: {
            kind: "sign_in_otp",
            otp,
            email,
            expiresInMinutes: SIGN_IN_OTP_EXPIRY_SECONDS / 60,
          },
        });
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
          const { sendEmail } = await import("@/core/integrations/email/send");
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
      // email-OTP and Google paths. Both flows mint a session before
      // this hook runs (`newSession` is populated); we record login
      // analytics only when a session was actually minted.
      // ISSUE-42 PR C: the magic-link plugin is unmounted — the audit
      // action emitted for sign-in OTP is `SIGN_IN_EMAIL_OTP`.
      // `SIGN_IN_MAGIC_LINK` stays in the AuditAction union for
      // historical-row backwards-compat.
      const isEmailOtpSendVerification =
        path === "/email-otp/send-verification-otp";
      const isEmailOtpSignIn =
        path === "/sign-in/email-otp" || path === "/email-otp/verify-email";
      const isGoogleSignIn = path === "/sign-in/social";
      const isAnySignIn =
        isEmailOtpSendVerification || isEmailOtpSignIn || isGoogleSignIn;

      // PR 4: 2FA management endpoints. The `/two-factor/enable` and
      // `/two-factor/disable` paths set `newSession` (Better Auth
      // refreshes the session after toggling 2FA), so we read the
      // user from there. Backup-code regeneration uses the existing
      // session — `newSession` is also populated.
      const isTwoFactorEnable = path === "/two-factor/enable";
      const isTwoFactorDisable = path === "/two-factor/disable";
      const isBackupCodeRegen = path === "/two-factor/generate-backup-codes";
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
      const ip = ctx.request?.headers.get("x-forwarded-for") ?? null;
      const userAgent = ctx.request?.headers.get("user-agent") ?? null;

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
        if (isEmailOtpSignIn) {
          // ISSUE-42: the email-OTP sign-in path emits
          // `SIGN_IN_EMAIL_OTP` audit entries. `SIGN_IN_MAGIC_LINK`
          // remains in the union for backwards-compat with historical
          // rows — no new rows are emitted under that constant.
          await createAuditLog({
            action: "SIGN_IN_EMAIL_OTP",
            targetType: "USER",
            targetId: userId,
            actor: { actorId: userId, actorRole },
            metadata: { ip, userAgent },
          });
        }

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
          // means an existing email-OTP user linked their Google
          // identity in this flow (auto-link by verified email).
          // Distinguish "new user via Google" from "linked Google to
          // existing user" so the audit log tells the right story.
          const justLinked = await db.query.account.findFirst({
            where: (a, { and, eq }) =>
              and(eq(a.userId, userId), eq(a.providerId, "google")),
          });
          if (justLinked) {
            const ageMs = Date.now() - new Date(justLinked.createdAt).getTime();
            if (ageMs < 60_000) {
              const existingAccountsForUser = await db.query.account.findMany({
                where: (a, { eq }) => eq(a.userId, userId),
              });
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
