# Replace Magic-Link Sign-In with Email OTP (Better Auth `emailOTP` plugin)

## Status

- **Created**: 2026-08-06
- **Status**: In Progress — PR 0 (this file) shipped; foundation (PR A), UI (PR B), cleanup (PR C) next
- **Priority**: Medium
- **Complexity**: Medium
- **Target**: Production
- **Phasing**: 4 commits / PRs (PR A foundation, PR B UI, PR C cleanup)
- **Blocks**: nothing on the roadmap
- **Follow-up**: ISSUE-43 (harden `pendingInvitation` accept — token hashing, accept rate-limit, attempt counter, audit-log) — out of scope here

## Summary

Replace Better Auth's `magicLink` plugin for user/admin sign-in with its built-in `emailOTP` plugin. Sign-in becomes a two-step browser flow: enter email → receive a 4-digit code → enter code → session minted. Better Auth's `emailOTP` plugin is already in `node_modules` (verified at `node_modules/better-auth/dist/plugins/email-otp/`), so no new dependency.

Google OAuth, 2FA (TOTP + email OTP), invitations, and participant/stage-portal auth are **untouched**. The `magicLink` plugin is unmounted in PR C as part of the cutover — no parallel/deprecation mount.

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | OTP length | **4 digits** (matches user override; lower friction than 6 on mobile keyboards) |
| 2 | `storeOTP` mode | **`hashed`** (security uplift over magic-link's `plain`; forces invitation-accept replay to use `auth.api.createVerificationOTP` which returns the OTP string in the response — no DB read-back needed) |
| 3 | Cutover | **Hard** — old `/api/auth/magic-link/verify` URLs become 404; no deprecation mount |
| 4 | Invitation mechanism | **Link** (unchanged) — OTP can't carry payload / preview / forwardability; the existing `/invite/[token]` page stays as-is. Separate ISSUE-43 covers tightening it. |
| 5 | Library | Better Auth's built-in `emailOTP` plugin (no new dep) |
| 6 | OTP lifetime | **5 min** (matches existing `two_factor_otp`; consistent mental model across the two email-OTP flows) |
| 7 | Attempts per code | **3** (`allowedAttempts: 3`) |
| 8 | Server-side rate limit | Better Auth default (`window: 60s, max: 3` on `send-verification-otp`) |
| 9 | Resend button cooldown | 30 s client-side |
| 10 | Audit-log action | Rename to **`SIGN_IN_EMAIL_OTP`** (supersedes `SIGN_IN_MAGIC_LINK`; historical rows keep old constant for backwards-compat) |
| 11 | `GREENROOM_SILENT_AUTH` env | Reused for the new `emailOTP.sendVerificationOTP` hook so the invitation-accept path doesn't email twice |
| 12 | Auto sign-up | `disableSignUp: false` (no regression vs current magic-link auto-create behaviour) |
| 13 | Base branch | `develop` (per user instruction) |
| 14 | Branch model | Direct commits / short-lived branches targeting `develop` (no long-lived `feature/auth-otp-sign-in` branch) |
| 15 | Subject line | `[Greenroom] Your sign-in code` (distinct from existing `two_factor_otp`'s "verification code") |

---

## Background — why

### Current state
- Better Auth's `magicLink` plugin (`/api/auth/magic-link/verify`) is the sign-in path. User enters email → receives email with a clickable URL → clicks → session minted.
- 30-min expiry, token stored `plain` in `verification.value`.
- Issue: requires leaving the inbox to use the app. Mobile friction (~30 % of users per analytics). Token-in-URL is also vulnerable to referrer leaks and email forwarding that shares the link with unintended recipients.
- Existing `two_factor_otp` kind already proves the OTP UX works for the same user base.

### Why OTP
- 4 digits pasteable from Gmail/iOS Mail with one tap (uses `autocomplete="one-time-code"`).
- `storeOTP: "hashed"` makes a DB dump insufficient to replay codes.
- 5-min window + 3-attempt cap bounds online-attack surface.
- Same mental model as the existing `two_factor_otp` code users already receive.

### What this is NOT
- Not a switch to SMS OTP — email only.
- Not a password system — purely replaces the existing magic-link click-the-link UX.
- Not a participant / stage-portal change — those keep their own OTP/session flows.

---

## Current architecture (compact reference)

```
[browser] /login
   └─ BetterAuthMagicLinkRequestForm.tsx
       └─ signIn.magicLink({ email, callbackURL })
            └─ POST /api/auth/sign-in/magic-link
                 └─ magicLink() plugin → sendMagicLink hook
                      └─ sendMagicLinkEmail(to, token, expiresInMinutes, callbackURL)
                           └─ sendEmail({ kind: "magic_link", token, ... })
                                └─ render.tsx → magic-link.tsx template
                                     └─ Resend API → email w/ button + copyable link

[browser] clicks the URL
   └─ GET /api/auth/magic-link/verify?token=...&callbackURL=...
        └─ magicLinkVerify → user row + session row, redirect to callbackURL
```

Files:
- `src/core/auth/better-auth/auth.ts:159-188` — `magicLink({...})` plugin config + `sendMagicLink` hook
- `src/core/auth/better-auth/client.ts:29` — `magicLinkClient()`
- `src/components/auth/BetterAuthMagicLinkRequestForm.tsx` — request UI (calls `signIn.magicLink`)
- `src/core/integrations/email/kinds/magic-link.tsx` — email template
- `src/core/integrations/email/types.ts:21-25` — `magic_link` EmailKind
- `src/core/integrations/email.ts:25-35` — `sendMagicLinkEmail` shim
- `src/core/auth/session.ts:128-183` — `signInUserByEmail` uses magic-link replay
- `src/test/integration/better-auth-magic-link.test.ts` — integration test

---

## Target architecture (after PR B)

```
[browser] /login
   └─ EmailOtpSignInForm.tsx (two-step)
       ├─ step 1: email → signIn.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
       │    └─ POST /api/auth/email-otp/send-verification-otp
       │         └─ emailOTP() plugin → sendVerificationOTP hook
       │              └─ sendEmail({ kind: "sign_in_otp", otp, email })
       │                   └─ render.tsx → sign-in-otp.tsx (4-digit code block)
       │                        └─ Resend API → email
       └─ step 2: 4-digit code → signIn.emailOtp.verify({ email, otp })
            └─ POST /api/auth/sign-in/email-otp
                 └─ verify OTP (hashed) → user row + session row, set cookie
```

Same `two_factor_otp` template continues to be sent when 2FA is enabled — distinct subjects distinguish the two codes in the user's inbox.

---

## Phasing

### PR A — Foundation (plugin swap, server-only, no UI change yet)
**Goal:** Swap the server-side plugin without touching the UI. Old magic-link path still works until PR C; we leave the plugin mounted (REMOVED in PR C) and ALSO mount `emailOTP` for users who trigger the new endpoint via a quick `curl` test. UI stays on `BetterAuthMagicLinkRequestForm` until PR B.

Wait — this is actually fine to mount both plugins during PR A since the two plugins don't share storage. PR B adds the new UI form, PR C removes magic-link. (We could skip mounting `emailOTP` in PR A and only mount in PR B, but then tests can't exercise it server-side.)

Recommendation: PR A mounts `emailOTP` alongside `magicLink`. Both are live. PR B ships the new UI. PR C drops `magicLink`. The cookie + `verification` table are shared, so both can co-exist.

**Tasks**
1. `src/core/auth/better-auth/auth.ts`:
   - Add `emailOTP({...})` plugin alongside existing `magicLink({...})`
   - `otpLength: 4, expiresIn: 300, allowedAttempts: 3, storeOTP: "hashed", sendVerificationOTP: ...`
   - Hook calls `sendEmail({ kind: "sign_in_otp", otp, email })` (respecting `GREENROOM_SILENT_AUTH`)
   - Add audit paths: `/sign-in/email-otp`, `/email-otp/send-verification-otp` (still emit `SIGN_IN_EMAIL_OTP` audit; for now keep `SIGN_IN_MAGIC_LINK` for the old path until PR C)
2. `src/core/integrations/email/types.ts` — add `sign_in_otp { otp, email, expiresInMinutes? }` to the `EmailKind` union; add to `EMAIL_KINDS` + `EMAIL_KIND_META`
3. `src/core/integrations/email/kinds/sign-in-otp.tsx` — new template (mirror `two-factor-otp.tsx` with 4-digit code block)
4. `src/core/integrations/email/render.tsx` — route the new kind
5. `src/core/auth/session.ts` — rewrite `signInUserByEmail` to use `auth.api.createVerificationOTP` (silent) → `auth.api.signInEmailOTP({ email, otp })`. Cleaner than the magic-link JSON read-back.
6. `src/test/integration/better-auth-magic-link.test.ts` — rename to `better-auth-email-otp.test.ts`, change `signInMagicLink` / `magicLinkVerify` → `sendVerificationOTP` / `signInEmailOTP`. Add test for attempt limit + expiry.
7. `src/core/auth/better-auth/auth.test.ts` — assert `signInEmailOTP`, `sendVerificationOTP`, `createVerificationOTP` surface.
8. `src/core/auth/session.test.ts` — update mocks (`signInMagicLink`/`magicLinkVerify` → `createVerificationOTP`/`signInEmailOTP`).
9. `src/core/auth/better-auth/client.test.ts` — `signIn.emailOtp` not yet (UI lands PR B); update to surface test only when client swap ships.
10. Run `pnpm lint` and `pnpm test`

**Risk: Low.** Additive — old sign-in path unchanged.

### PR B — UI (new form, wire to login)
**Goal:** Ship the new two-step OTP form, delete the old magic-link request form.

**Tasks**
1. `src/components/auth/EmailOtpSignInForm.tsx` (new) — two-step form:
   - step 1: email + terms checkbox + "Send code" button
   - step 2: "Check your inbox" → 4-digit OTP input (`autocomplete="one-time-code"`, `inputmode="numeric"`, auto-submit on 4 digits), Resend button (30 s client cooldown), "Use a different email" back-nav
2. `src/components/auth/BetterAuthMagicLinkRequestForm.tsx` — **delete**
3. `src/app/login/page.tsx` — render `EmailOtpSignInForm`. Metadata description → "Enter your email — we'll send you a 4-digit code."
4. `src/core/auth/better-auth/client.ts` — `magicLinkClient()` → `emailOTPClient()`
5. `src/core/auth/better-auth/client.test.ts` — assert `signIn.emailOtp` exists
6. Run `pnpm lint` and `pnpm test`

**Risk: Medium.** First user-facing change. Old magic-link email URLs already work via the plugin mount from PR A; new users see the OTP form.

### PR C — Cleanup (drop magic-link)
**Goal:** Unmount `magicLink` plugin. Old `/api/auth/magic-link/verify` URLs become 404. Rename audit action.

**Tasks**
1. `src/core/auth/better-auth/auth.ts` — remove `magicLink` import, plugin call, `sendMagicLink` hook, `MAGIC_LINK_EXPIRY_SECONDS` constant. Keep `GREENROOM_SILENT_AUTH` honour path but for `emailOTP.sendVerificationOTP` only.
2. After-hook:
   - Drop the `isMagicLinkVerify` / `isMagicLinkSignIn` branches
   - Add `isEmailOtpSend = path === "/email-otp/send-verification-otp"`, `isEmailOtpSignIn = path === "/sign-in/email-otp"`
   - Audit action emits as `SIGN_IN_EMAIL_OTP` (new constant). Keep `SIGN_IN_MAGIC_LINK` constant declared for backwards-compat with historical audit rows — do not remove.
3. `src/core/integrations/email/kinds/magic-link.tsx` — **delete**
4. `src/core/integrations/email/types.ts` — drop `magic_link` from the union, `EMAIL_KINDS`, `EMAIL_KIND_META`
5. `src/core/integrations/email/render.tsx` — drop the magic-link branch
6. `src/core/integrations/email.ts` — drop `sendMagicLinkEmail` from the shim
7. `src/features/auth/services/audit-log.service.ts` — add `SIGN_IN_EMAIL_OTP` to `AuditAction` union (alongside retained `SIGN_IN_MAGIC_LINK`)
8. Tests — update any remaining references to magic-link paths/kinds/templates
9. Run `pnpm lint` and `pnpm test:integration` against real Postgres

**Risk: Medium.** Old magic-link URLs in flight become 404. Communicate to users. No `verification` row to consume.

---

## Files

### Add
| File | Purpose | PR |
|---|---|---|
| `issues/ISSUE-42-replace-magic-link-with-email-otp.md` | This file | 0 (docs) |
| `src/core/integrations/email/kinds/sign-in-otp.tsx` | New email template | A |
| `src/components/auth/EmailOtpSignInForm.tsx` | Two-step sign-in form | B |
| `src/test/integration/better-auth-email-otp.test.ts` | Renamed integration test | A |

### Delete
| File | Reason | PR |
|---|---|---|
| `src/components/auth/BetterAuthMagicLinkRequestForm.tsx` | Replaced by `EmailOtpSignInForm` | B |
| `src/core/integrations/email/kinds/magic-link.tsx` | Replaced by `sign-in-otp` template | C |

### Modify
| File | Change | PR |
|---|---|---|
| `src/core/auth/better-auth/auth.ts` | Add `emailOTP` plugin (PR A); remove `magicLink` plugin (PR C) | A, C |
| `src/core/auth/better-auth/client.ts` | Swap `magicLinkClient` → `emailOTPClient` | B |
| `src/core/auth/session.ts` | Rewrite `signInUserByEmail` | A |
| `src/core/auth/better-auth/auth.test.ts` | Surface assertions | A |
| `src/core/auth/better-auth/client.test.ts` | Surface assertions | B |
| `src/core/auth/session.test.ts` | Mock updates | A |
| `src/core/integrations/email/types.ts` | Add `sign_in_otp` (A); drop `magic_link` (C) | A, C |
| `src/core/integrations/email/render.tsx` | Route new kind (A); drop old kind (C) | A, C |
| `src/core/integrations/email.ts` | Drop `sendMagicLinkEmail` shim | C |
| `src/app/login/page.tsx` | Render new form + update metadata | B |
| `src/features/auth/services/audit-log.service.ts` | Add `SIGN_IN_EMAIL_OTP` constant | C |

Total: ~12 files touched across 3 PRs.

---

## Schema changes

None. Better Auth's `verification` table already stores both magic-link tokens and OTPs (`identifier`, `value`, `expiresAt`). The `magicLinkToken` table becomes dead after PR C — left in place to avoid bundling a drop migration with this work; removal is a separate cleanup PR.

---

## Env vars

None added. None removed. The existing `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` continue to drive the new path. The `GREENROOM_SILENT_AUTH` env flag (already in use) is honoured by the new `sendVerificationOTP` hook for the invitation-accept replay.

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | 4-digit code = 10⁴ entropy, brute-forceable without rate-limit | Medium | Medium | `allowedAttempts: 3` + Better Auth `rateLimit: { window: 60, max: 3 }` + 5-min window. Online-attack bounded. |
| 2 | User confusion when both `sign_in_otp` and `two_factor_otp` arrive in the inbox within minutes | Medium | Low | Distinct subjects and body copy. |
| 3 | Email delivery latency breaks the OTP UX (user clicks Resend rapidly) | Medium | Low | 30 s client-side Resend cooldown + server-side `max: 3/min` throttle. |
| 4 | `storeOTP: hashed` change breaks `signInUserByEmail` magic-link replay path | Certain | Medium | Solved by switching to `auth.api.createVerificationOTP` which returns the OTP in the response — no read-back needed. |
| 5 | Old magic-link `/api/auth/magic-link/verify` URLs become 404 in PR C | Certain | Low | Communicate to users in the release notes; not a deprecation mount. |
| 6 | `audit-log` enum extension if old `SIGN_IN_MAGIC_LINK` rows need to remain queryable | Medium | Low | Keep the old constant declared in the union; only emit new rows with `SIGN_IN_EMAIL_OTP`. |
| 7 | `emailOTP` + `magicLink` both mounted in PR A → two code paths in the verification table | Low | Low | The `verification` table is shared; both schemas use it; no collision in practice. Confirmed via type-check. |
| 8 | Resend sends faster than Resend's per-second quota allows under spam | Low | Low | Better Auth default `max: 3/min` is well under Resend's limit. |
| 9 | Local dev: OTP code only visible in terminal without `RESEND_API_KEY` | Certain | Low | Existing `devFallback` already handles this; document for devs. |

---

## Out of Scope (v1)

- Migrating participant or stage-portal auth to use `emailOTP` — they have different principal shapes
- Hardening the `pendingInvitation` token (ISSUE-43) — separate issue
- Switching to password + TOTP-only (out of scope; current 2FA stays)
- Phone/SMS OTP — email only
- Replacing `magicLinkToken` table drop migration

---

## Implementation status

| PR | Title | Status | Shipped |
|---|---|---|---|
| 0 | Docs: ISSUE-42 spec | **Done** | this commit |
| A | Foundation (plugin mount, email kind, signInUserByEmail rewrite) | pending | — |
| B | UI (EmailOtpSignInForm, login page wire-up, client plugin swap) | pending | — |
| C | Cleanup (drop magicLink, rename audit action) | pending | — |

---

## References

- [Better Auth email-OTP plugin docs](https://www.better-auth.com/docs/plugins/email-otp)
- `node_modules/better-auth/dist/plugins/email-otp/types.d.mts` — option surface
- ISSUE-41 (foundation that this issue builds on)
- Predecessor email template: `src/core/integrations/email/kinds/two-factor-otp.tsx`
