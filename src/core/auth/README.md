# Auth

Greenroom has **three** session systems. Each serves a different
principal shape and lifetime, and unifying them was considered and
rejected — the migration to a single auth library would require either
adding a `user` row for participants (and a way to deactivate it after
the festival) or extending Better Auth with a "guest" principal type
that we don't need. The shared cookie lib at the bottom keeps the
cookie set/get/delete shape identical across all three.

## 1. User / admin (Better Auth)

**Owner:** Better Auth (`src/core/auth/better-auth/auth.ts`).
**Cookie name:** `better-auth.session_token` (set by Better Auth).
**Backend:** DB row in the `session` table; revocable.
**Principals:** A row in the `user` table with a `globalRole`
(`"USER"` or `"SUPER_ADMIN"`) stored as a Better Auth `additionalField`.

**Sign-in:** Better Auth's `emailOTP` plugin (ISSUE-42) — 4 digits pasteable
on mobile (`autocomplete="one-time-code"`), 5-minute window, 3 attempts per
code, hashed at rest. The browser flow is two-step: enter email → enter
the 4-digit code (see `src/components/auth/EmailOtpSignInForm.tsx`).
Server-routed through our existing Resend sender
(`SendVerificationOTP` hook → `sendEmail({ kind: "sign_in_otp" })`).

**2FA:** the `twoFactor` plugin is enabled in `auth.ts` — TOTP (authenticator
apps, 6 digits / 30s) plus email OTP as a fallback, 10 backup codes of
length 10, and account lockout (10 failed attempts → 15-minute cool-off,
NIST SP 800-63B §5.2.2). Passwordless users (email-OTP or Google-only)
can still enable 2FA. After enabling, the first sign-in factor that
succeeds lands the user on `/auth/2fa` for the second factor; the
challenge page handles TOTP / OTP / backup-code tabs. Setup, disable, and
backup-code regeneration live in `/profile` (Settings tab → Security
section). See `src/app/(auth)/2fa/page.tsx` and
`src/components/auth/TwoFactorSetup.tsx`.

**Public API:**

- `getSession(): Promise<SessionPayload | null>` — the adapter every
  caller consumes. Reads `auth.api.getSession({ headers })` and maps
  the result to `{ userId, role, expires }`. Returns `null` when no
  session exists or the user is deactivated.
- `createSession(userId, role): Promise<void>` — back-compat shim. Looks
  up the user's email and calls `signInUserByEmail` so the existing
  `createSession(dbUser.id, role)` call site in
  `invitations/accept` still works.
- `signInUserByEmail(email): Promise<Response>` — mint a session for a known
  email without sending an email. Creates an OTP via
  `auth.api.createVerificationOTP` (with the `sendVerificationOTP` hook
  suppressed via `process.env.GREENROOM_SILENT_AUTH`), then consumes it
  via `auth.api.signInEmailOTP({ asResponse: true })`. Returns the raw
  Response so Route Handlers can forward `Set-Cookie` onto their reply.
- `appendSetCookieHeaders(target, source)` — copies `Set-Cookie` headers
  from a Better Auth response onto a `NextResponse`.
- `deleteSession(): Promise<void>` — calls `auth.api.signOut({ headers })`.

The legacy JWT cookie (`session`), `JWT_SECRET` env, and magic-link
plugin are gone (see ISSUE-41 for the migration, ISSUE-42 for the
magic-link → email-OTP cutover). The `magicLinkToken` DB table is a
no-op left behind by the migration; dropping it is a separate cleanup.

## 2. Participant (custom)

**Owner:** `src/core/auth/participant-session.ts`.
**Cookie name:** `participant_session`.
**Backend:** DB row in `participant_session`, sha256-hashed token. 12-hour
TTL. Revocable via `revokedAt`.
**Principal:** A row in the `participant` table (no `user` row).

The principal is a participant within a specific festival — different
lifetime, different access pattern, different "user" surface than the
admin path. Pulling this into Better Auth would require either creating
a transient `user` row per participant (and tying it to the festival
lifecycle) or adding a "guest" principal type to Better Auth.

## 3. Stage portal (custom)

**Owner:** `src/core/auth/stage-portal-session.ts`.
**Cookie name:** `stage_portal_session`.
**Backend:** DB row in `stage_portal_session`, sha256-hashed token.
24-hour TTL. Revocable.
**Principal:** A row in `stage_portal_credential` (a username/password
for an on-stage judge or announcer, scoped to a stage). No `user` row.

Same reasoning as participant auth.

## Shared cookie lib (`src/core/auth/cookie-session.ts`)

Both custom session systems route their cookie set/get/delete calls
through this lib so the cookie options (`httpOnly`, `secure`, `sameSite`,
`path`) stay consistent. New principals (e.g. a future "press" portal)
should follow the same pattern.

```ts
import {
  createCookieSession,
  getCookieSession,
  deleteCookieSession,
} from "@/core/auth/cookie-session";
```

Better Auth doesn't use this lib — its cookies are set by the
`nextCookies` plugin via `Set-Cookie` and Better Auth's internal cookie
cache. Mixing the two layers would be confusing.
