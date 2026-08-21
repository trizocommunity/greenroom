# Unified Branded Email Layer (React Email + Dark/Light Themes)

## Status
- **Created**: 2026-08-01
- **Status**: Implemented (PR 1 of 1 — narrowed scope)
- **Priority**: Medium-High
- **Complexity**: Medium
- **Target**: Production

---

## Summary

Replace the four hand-rolled HTML email templates in `src/core/integrations/email.ts` with a typed, themed, React-Email-based module. Centralise the layout, brand palette, and Resend wiring in one place; expose a discriminated-union `EmailKind` registry so adding a new email is one file; and let super-admin enable/disable each kind globally from a new sidebar page.

### Final scope (narrowed after product review)

Only **4 kinds** ship in this PR — Tier 1 (auth-critical) plus a single operational notification. The Tier 3/4 in-app notification emails stay in-app; the global toggle in the email-settings page is the gate, so adding a kind later is one renderer + one registry line + one toggle row, no schema work.

| Kind | Trigger | Default theme |
|---|---|---|
| `magic_link` | Sign-in request | dark |
| `festival_invitation` | Team member invite | light |
| `team_leader_otp` | Team leader portal login | dark |
| `festival_expiring_soon` | Daily cron, 7 days before 90-day expiry | dark |

Super-admin controls a global on/off toggle per kind via `/super-admin/email-settings` (new sidebar entry). `sendEmail` checks the toggle before rendering; disabled kinds return `{ id: "skipped-…", kindDisabled: true }`.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Template format | **React Email** (`@react-email/components`) — JSX components render via `@react-email/render` to HTML + plaintext |
| 2 | Themes | **Dark + Light** variants. Each kind declares `defaultTheme`; `sendEmail({ theme })` overrides per send. Mirrors `src/app/globals.css` tokens. |
| 3 | Backwards-compat | **Thin re-export shim** in `src/core/integrations/email.ts` so existing callers keep working unchanged. `sendPlainFestivalEmail` removed (no callers + no `festival_announcement` kind in this scope). |
| 4 | Logo | **Inline wordmark** (no external image, no Resend fetch dependency) |
| 5 | Subject line | **`[Greenroom] <kind-specific subject>`** prefix for Gmail filtering |
| 6 | Preferences storage | **`system_config` table** with `key = "email:kind:<kind>"` and `value = { enabled: boolean }`. No schema migration. |
| 7 | Preferences control | **Global admin switch only** — super-admin sets, all users see the result. No per-user override. |
| 8 | Defaults | All kinds default to `enabled: true` if no `system_config` row exists |

---

## Problem Statement

`src/core/integrations/email.ts` (now 225 lines, before refactor) had four near-duplicate functions (`sendMagicLinkEmail`, `sendInvitationEmail`, `sendTeamLeaderOtpEmail`, `sendPlainFestivalEmail`), each hand-rolling `<html><body><div style="background:#0a0a0a; …">` shells with hard-coded hex values that mirror but are **not derived from** `src/app/globals.css:42-58`. Two consecutive `EMAIL_FROM=.com` vs Resend `.in` domain mismatches made the email layer fragile.

Adding new email kinds (payment receipts, programme reporting, festival expiry warnings) means another 60-line HTML string. The duplication is the bottleneck. There was also no way for the operator to turn off a specific email kind globally.

---

## Solution

### Module layout (shipped)

```
src/core/integrations/email/
  index.ts                       # public API: sendEmail + types
  types.ts                       # EmailKind union + EMAIL_KINDS registry + EMAIL_KIND_META
  send.ts                        # Resend + dev fallback + global toggle check
  render.tsx                     # per-kind dispatcher; subject + html + text
  tokens.ts                      # DARK_TOKENS + LIGHT_TOKENS mirroring globals.css
  theme.ts                       # Tailwind config builder (semantic class names)
  components/
    Layout.tsx                   # <BrandedLayout theme preview>children</BrandedLayout>
    Button.tsx                   # <EmailButton href>children</EmailButton>
    Footer.tsx                   # shared footer with brand + safe "ignore this" note
    Wordmark.tsx                 # inline brand mark (no external fetch)
  kinds/
    magic-link.tsx
    festival-invitation.tsx
    team-leader-otp.tsx
    festival-expiring-soon.tsx
  __tests__/
    render.test.ts               # per-kind render + theme-swap tests
    send.test.ts                 # send.ts honours global toggle
    tokens-drift.test.ts         # tokens.ts hex values match globals.css

src/core/integrations/email.ts                  # BACKWARDS-COMPAT: thin shim (~30 lines)

src/features/email-preferences/
  services/
    email-preferences.service.ts # system_config read/write per kind toggle

src/app/api/v1/super-admin/email-settings/
  route.ts                       # GET (list kinds + current state) + POST (bulk update)

src/app/(admin)/super-admin/email-settings/
  page.tsx                       # server component
  EmailSettingsClient.tsx        # client component for toggles
  loading.tsx                    # suspense fallback

src/config/sidebar.config.ts     # + "Email Settings" sidebar entry
src/app/api/v1/cron/route.ts     # calls runFestivalExpiringSoonEmails()
src/features/festivals/services/festival-expiration.service.ts
                                  # + runFestivalExpiringSoonEmails() (idempotent)
src/core/database/schema.ts      # + festivalExpiringSoonEmailSentAt column
```

### Public API

```ts
import { sendEmail } from "@/core/integrations/email";
import type { EmailKind, EmailTheme, SendEmailResult } from "@/core/integrations/email";

type EmailKind =
  | { kind: "magic_link"; token: string; expiresInMinutes?: number }
  | { kind: "festival_invitation"; token: string; festivalName: string; role: string; expiresInHours?: number }
  | { kind: "team_leader_otp"; otp: string; festivalName: string; expiresInMinutes?: number }
  | { kind: "festival_expiring_soon"; festivalName: string; daysRemaining: number; expiresOn: string; dashboardUrl: string };

type SendEmailResult =
  | { id: string }
  | { id: string; kindDisabled: true }
  | { error: { message: string } };

await sendEmail({
  to: "user@example.com",
  kind: { kind: "magic_link", token: "..." },
  theme?: "dark" | "light",  // overrides the kind's default
});
```

### Festival expiring soon cron

The existing daily cron at `/api/v1/cron` now also calls `FestivalExpirationService.runFestivalExpiringSoonEmails()`:

- Reuses the existing `getFestivalsApproachingExpiry()` query (festivals with `expiresAt` in the next 7 days, not yet `EXPIRED`)
- For each festival with `festivalExpiringSoonEmailSentAt IS NULL`:
  - Look up owner email
  - `sendEmail` with `festival_expiring_soon` kind
  - On success: set `festivalExpiringSoonEmailSentAt = now()`
- Idempotent — second cron tick in the same window is a no-op
- Owner-side errors are logged, not thrown

---

## Acceptance Criteria (all met)

- [x] `pnpm add @react-email/components @react-email/render` succeeds
- [x] `src/core/integrations/email/{tokens,theme}.ts` export DARK + LIGHT palettes + Tailwind config
- [x] `<BrandedLayout>`, `<EmailButton>`, `<EmailFooter>`, `<EmailWordmark>` primitives
- [x] 4 kind renderers (magic-link, festival-invitation, team-leader-otp, festival-expiring-soon)
- [x] `send.ts` checks global toggle before dispatch; returns `{ kindDisabled: true }` when off
- [x] `src/core/integrations/email.ts` shim wraps `sendEmail` for the 3 still-in-use legacy functions (`sendPlainFestivalEmail` removed)
- [x] `system_config` table used for toggles — no migration needed
- [x] `/api/v1/super-admin/email-settings` GET + POST endpoints
- [x] `/super-admin/email-settings` admin page with per-kind toggle buttons
- [x] `SUPER_ADMIN_SIDEBAR_ITEMS` includes "Email Settings"
- [x] Cron calls `runFestivalExpiringSoonEmails`; idempotent via `festivalExpiringSoonEmailSentAt`
- [x] Vitest: 14 tests pass (per-kind render, theme swap, send.ts toggle, tokens drift)
- [x] Biome lint clean across all 26 touched files
- [x] `pnpm exec tsc --noEmit` clean (no new errors)

---

## Out of Scope (deferred)

- **Per-user opt-out** — global toggle only, per spec
- **Markdown body for announcements** — `festival_announcement` kind was removed from scope; only 4 kinds ship
- **Tier 3+ kinds** (reporting_*, result_published, payment_*, etc.) — flagged for separate follow-up issues
- **Email preview script** — deferred per scope decision
- **Removing the legacy shim** — kept indefinitely until a deliberate deprecation pass

---

## Testing Strategy

1. **Per-kind render tests** (`__tests__/render.test.ts`, 8 tests): subject, dark theme canvas hex, brand hex, URL/token in html and text, theme override switches palette, expiry-minutes overrides, singular/plural day text
2. **Send tests** (`__tests__/send.test.ts`, 4 tests): kindDisabled path, Resend path with mock, dev fallback when `RESEND_API_KEY` unset, EMAIL_KINDS registry contents
3. **Drift test** (`__tests__/tokens-drift.test.ts`, 2 tests): every `tokens.ts` hex value matches the corresponding `--name` in `:root { ... }` (LIGHT) or `.dark { ... }` (DARK) block of `globals.css`. Fails CI on drift.
4. **Manual smoke**: `scripts/test-resend.ts` (created during this work) sends a test email end-to-end through Resend with the `.in` domain — verified working.

---

## Files Touched (final count)

| Action | File |
|---|---|
| New | `src/core/integrations/email/index.ts` |
| New | `src/core/integrations/email/types.ts` |
| New | `src/core/integrations/email/send.ts` |
| New | `src/core/integrations/email/render.tsx` |
| New | `src/core/integrations/email/tokens.ts` |
| New | `src/core/integrations/email/theme.ts` |
| New | `src/core/integrations/email/components/{Layout,Button,Footer,Wordmark}.tsx` |
| New | `src/core/integrations/email/kinds/{magic-link,festival-invitation,team-leader-otp,festival-expiring-soon}.tsx` |
| New | `src/core/integrations/email/__tests__/{render,send,tokens-drift}.test.ts` |
| New | `src/features/email-preferences/services/email-preferences.service.ts` |
| New | `src/app/api/v1/super-admin/email-settings/route.ts` |
| New | `src/app/(admin)/super-admin/email-settings/{page,EmailSettingsClient,loading}.tsx` |
| Modify | `src/core/integrations/email.ts` (rewrite as thin shim) |
| Modify | `src/core/database/schema.ts` (+ `festivalExpiringSoonEmailSentAt`) |
| Modify | `src/app/api/v1/cron/route.ts` (+ `runFestivalExpiringSoonEmails`) |
| Modify | `src/features/festivals/services/festival-expiration.service.ts` (+ `runFestivalExpiringSoonEmails`) |
| Modify | `src/config/sidebar.config.ts` (+ Email Settings entry) |
| Modify | `package.json` (+ 2 deps) |

Diff: ~1,100 added, ~190 removed across ~22 files.
