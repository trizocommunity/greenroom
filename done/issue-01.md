# issue-01: Auth Refactor — Magic Link + Institutional Onboarding + Invitation Flow

**Status:** ✅ DONE

## TL;DR

Replace password-based auth with magic link (Resend). Add account-type onboarding (PERSONAL/INSTITUTIONAL). Add invitation system for team member onboarding. No permission changes — userRole is display-only text. accountType is display badge only.

---

## Problem Statement

Current auth is password-based (bcrypt, JWT sessions). Onboarding collects only fullName + displayName — insufficient for institutional SaaS targeting campuses/colleges/madrasas. No invitation flow for team members.

---

## Consolidated Decisions (Locked)

| Decision | Value |
|----------|-------|
| Auth mechanism | Magic link (Resend); dev mode prints to terminal |
| No passwords | bcrypt removed entirely |
| Account types | `PERSONAL` vs `INSTITUTIONAL` |
| Onboarding branch | After magic link click, based on accountType |
| userRole | Display-only text — does NOT affect any permission |
| accountType badge | Display only — does NOT affect permissions |
| Trial model | Instant access — payment only at festival creation |
| Personal users | Can create INDEPENDENT festivals; can join multiple festivals via invitation |
| Onboarding completion | Redirect to `/profile` (both types) |
| Magic link token | Single-use, 15-min expiry |
| Magic link existence check | Never reveal if user exists — "If this email exists, a magic link was sent" |
| Invitation token | One token = one festival + one role, 48h expiry |
| Stub user creation | On first magic link click (not on invitation creation) |
| Institution upgrade path | Not needed — PERSONAL/INSTITUTIONAL is display only |

---

## Phase 1: Auth Core

### 1-A: Schema Changes

**`user` table** — modify:
```typescript
// Remove: password, age
// Add:
accountType: 'PERSONAL' | 'INSTITUTIONAL'  // nullable until onboarding
institutionId: text FK → institution.id     // nullable
```

**`magic_link_token` table** — new:
```typescript
id: text PK
email: text NOT NULL
token: text NOT NULL UNIQUE  // 32 bytes hex, cryptographically random
expiresAt: timestamp NOT NULL
usedAt: timestamp NULL       // null until consumed
createdAt: timestamp
```

**`pending_invitation` table** — new:
```typescript
id: text PK
email: text NOT NULL
festivalId: text NOT NULL FK → festival.id
festivalRole: FestivalRole NOT NULL  // ADMIN | ANNOUNCER | STAGE_MANAGER | MEDIA
invitedBy: text NOT NULL FK → user.id
expiresAt: timestamp NOT NULL
acceptedAt: timestamp NULL
createdAt: timestamp
```

**`institution` table** — new:
```typescript
id: text PK
name: text NOT NULL
type: InstitutionType NOT NULL  // COLLEGE | MADRASA | SCHOOL | UNIVERSITY | INSTITUTION | CAMPUS | OTHER
affiliation: text               // optional board/education board
city: text
sizeRange: text                 // "1-100" | "100-500" | "500-2000" | "2000+"
ownerId: text NOT NULL FK → user.id
createdAt: timestamp
updatedAt: timestamp
```

**`festival` table** — modify:
```typescript
// Add:
institutionId: text FK → institution.id  // nullable
festivalType: 'INSTITUTIONAL' | 'INDEPENDENT'  // default: 'INDEPENDENT'
```

### 1-B: Magic Link Service

**`src/core/auth/magic-link.ts`** — new file:
```typescript
import { db } from "@/core/database/client";
import { magicLinkToken } from "@/core/database/schema";
import { randomBytes } from "crypto";

// Generate 32-byte hex token
export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

// Store token in DB
export async function createMagicLinkToken(email: string, expiresInMs: number) {
  const token = generateMagicToken();
  const expiresAt = new Date(Date.now() + expiresInMs);

  await db.insert(magicLinkToken).values({
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    token,
    expiresAt,
  });

  return token;
}

// Verify and consume token (single-use)
export async function consumeMagicLinkToken(token: string) {
  const record = await db.query.magicLinkToken.findFirst({
    where: and(
      eq(magicLinkToken.token, token),
      eq(magicLinkToken.usedAt, null),
      gt(magicLinkToken.expiresAt, new Date()),
    ),
  });

  if (!record) return null;

  await db.update(magicLinkToken)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkToken.id, record.id));

  return record;  // { id, email }
}
```

### 1-C: API Route Updates

**`POST /api/v1/auth?action=magic-link`**:
```
Input:  { email: string }
Logic:
  1. Find user by email (if not found, silently succeed — don't reveal existence)
  2. generateMagicToken() → store in magic_link_token, 15-min expiry
  3. Dev: console.log(`Magic link: http://localhost:3000/magic-link/${token}`)
  4. Prod: Resend.send("REACT_EMAIL_TEMPLATE", { to: email, props: { magicLinkUrl } })
Output: { success: true, message: "Magic link sent" }
```

**`POST /api/v1/auth?action=verify-magic-link`**:
```
Input:  { token: string }
Logic:
  1. consumeMagicLinkToken(token) → null if invalid/expired/used
  2. If invalid → error "Invalid or expired link"
  3. Find user by email (stub if not exists)
  4. createSession(user)
  5. Check if user has fullName
     - No fullName → { requiresOnboarding: true }
     - Has fullName → { requiresOnboarding: false }
Output: { success: true, role, requiresOnboarding }
Redirect: client-side redirect to /onboarding or /profile
```

### 1-D: Pages and Components

**`/magic-link`** (new page) — request magic link:
- Single email input
- "Send magic link" button
- Success state: "Check your email for a link"
- Error state: generic error message
- Already logged in → redirect to /profile

**`/magic-link/[token]`** (new page) — verify and authenticate:
- Called automatically on page load (no UI needed)
- On success → redirect based on requiresOnboarding
- On failure → show error, offer resend link

**`/login` and `/register`** — redirect to `/magic-link`:
- Update existing pages to redirect, or replace content with magic link form

### Files: Phase 1

**New:**
- `src/core/database/schema/magic-link-token.ts`
- `src/core/database/schema/pending-invitation.ts`
- `src/core/database/schema/institution.ts`
- `src/core/auth/magic-link.ts`
- `src/app/magic-link/page.tsx`
- `src/app/magic-link/[token]/page.tsx`
- `src/components/auth/MagicLinkRequestForm.tsx`

**Modify:**
- `src/core/database/schema.ts` — user.accountType, user.institutionId, festival.institutionId, festival.festivalType, institution enum/types
- `src/app/api/v1/auth/route.ts` — remove login action, add magic-link + verify-magic-link
- `src/features/auth/hooks/use-auth.ts` — remove useLogin, useRegister, add useMagicLink
- `src/features/auth/actions/auth.actions.ts` — remove login/register, add magic link actions
- `src/app/(auth)/login/page.tsx` — redirect to /magic-link
- `src/app/(auth)/register/page.tsx` — redirect to /magic-link
- `src/app/(auth)/forgot-password/page.tsx` — redirect to /magic-link
- `src/app/(auth)/reset-password/page.tsx` — redirect to /magic-link
- `src/components/auth/LoginForm.tsx` — deprecate
- `src/components/auth/RegisterForm.tsx` — deprecate
- `src/components/auth/ForgotPasswordForm.tsx` — deprecate
- `src/components/auth/ResetPasswordForm.tsx` — deprecate
- `src/api/contracts/auth.ts` — update schemas

**Verify Phase 1:**
- [ ] POST /api/v1/auth?action=magic-link → token logged in terminal (dev)
- [ ] POST /api/v1/auth?action=verify-magic-link with valid token → session cookie set
- [ ] POST /api/v1/auth?action=verify-magic-link with invalid token → error
- [ ] GET /api/v1/auth (me endpoint) → returns user without password field
- [ ] POST /api/v1/auth?action=logout → session deleted
- [ ] /magic-link page renders correctly
- [ ] /magic-link/[token] with valid token → redirects to /profile
- [ ] /magic-link/[token] with invalid token → shows error
- [ ] npm run lint — zero warnings
- [ ] npm run typecheck — zero errors

---

## Phase 2: Onboarding

### 2-A: Account Type Selector

**`/onboarding`** — account type selection:
```
1. If not authenticated → redirect /magic-link
2. If accountType already set → redirect /profile
3. Show two cards: "Personal Account" | "Institutional Account"
4. On select → navigate to /onboarding/personal or /onboarding/institutional
```

### 2-B: Personal Onboarding

**`/onboarding/personal`**:
```
Fields:
  - fullName (z.string().min(2))
  - displayName (z.string().min(2))
  - userRole (display dropdown): Teacher | Student | Judge | Independent | Other

On submit:
  - updateUser({ id, fullName, displayName, accountType: 'PERSONAL' })
  - redirect /profile
```

### 2-C: Institutional Onboarding

**`/onboarding/institutional`**:
```
Fields:
  - fullName (z.string().min(2))
  - displayName (z.string().min(2))
  - userRole (display dropdown): Principal | Dean | HOD | Teacher | Coordinator | Judge | Other
  - institutionName (z.string().min(2))
  - institutionType (dropdown): COLLEGE | MADRASA | SCHOOL | UNIVERSITY | INSTITUTION | CAMPUS | OTHER
  - affiliation (optional text)
  - city (text)
  - sizeRange (dropdown): "1-100" | "100-500" | "500-2000" | "2000+"

On submit:
  1. createInstitution({ name, type, affiliation, city, sizeRange, ownerId: user.id })
  2. updateUser({ id, fullName, displayName, accountType: 'INSTITUTIONAL', institutionId })
  3. redirect /profile
```

### 2-D: Profile Page Updates

**`/profile` page**:
```
1. Auth required; no accountType → redirect /onboarding
2. Display accountType badge (PERSONAL / INSTITUTIONAL) — cosmetic only
3. If accountType === PERSONAL → show "Upgrade to Institutional" CTA (cosmetic only — no functional change)
4. Show owned festivals (ownerId === user.id)
5. Show joined festivals (festival_member.userId === user.id)
6. Billing tab (existing)
7. Account settings tab (update fullName, displayName, userRole display text)
```

### Files: Phase 2

**New:**
- `src/app/(auth)/onboarding/page.tsx` — type selector
- `src/app/(auth)/onboarding/personal/page.tsx`
- `src/app/(auth)/onboarding/institutional/page.tsx`
- `src/components/onboarding/AccountTypeSelector.tsx`
- `src/components/onboarding/PersonalOnboardingForm.tsx`
- `src/components/onboarding/InstitutionalOnboardingForm.tsx`
- `src/features/auth/actions/onboarding.actions.ts`
- `src/features/institution/actions/institution.actions.ts`
- `src/features/institution/repositories/institution.repository.ts`

**Modify:**
- `src/app/(overview)/profile/page.tsx` — add accountType badge, owned/joined festivals
- `src/features/auth/hooks/use-auth.ts` — add useCompletePersonalOnboarding, useCompleteInstitutionalOnboarding

**Verify Phase 2:**
- [ ] /onboarding → shows account type selector when unauthenticated → redirects to /magic-link
- [ ] /onboarding → shows account type selector when no accountType
- [ ] /onboarding → redirects to /profile when accountType already set
- [ ] Personal onboarding → fills fullName, displayName, accountType = PERSONAL
- [ ] Institutional onboarding → creates institution + fills user fields correctly
- [ ] After onboarding → redirected to /profile with correct data
- [ ] /profile shows correct accountType badge
- [ ] npm run lint — zero warnings
- [ ] npm run typecheck — zero errors

---

## Phase 3: Invitation Flow

### 3-A: Invite Member Action

**`POST /api/v1/invitations`** (OWNER or ADMIN with members permission):
```
Input:  { email: string, festivalId: string, festivalRole: FestivalRole }
Logic:
  1. assertFestivalAccess(session, festivalId, { requireWritable: true })
  2. Check feature flag: if tier.members === false → error "Members not available on BASIC tier"
  3. Check existing active member with same email → error "Already a member"
  4. Create pendingInvitation record (48h expiry)
  5. Build invite URL: /invite/${token}
  6. Dev: console.log(`Invite link: http://localhost:3000${inviteUrl}`)
  7. Prod: Resend.send("INVITATION_EMAIL_TEMPLATE", { to: email, props: { inviteUrl, festivalName } })
Output: { success: true, invitationId }
```

### 3-B: Accept Invitation Page

**`/invite/[token]`**:
```
Logic:
  1. Validate token against pendingInvitation (exists, not expired, not accepted)
  2. If not authenticated:
     - Store { token, invitedEmail } in URL params or session
     - Redirect to /magic-link?email=${invitedEmail}&redirect=/invite/${token}
  3. After magic link auth:
     a. If user has no fullName → redirect /onboarding first, store token in cookie
     b. After onboarding, resume: check pendingInvitation again
     c. Create festival_member entry: { userId, festivalId, role, isActive: true }
     d. Update pendingInvitation.acceptedAt = now
     e. Redirect /dashboard/${festivalSlug}
  4. If already a member of this festival → error "Already a member"
```

### 3-C: List/Cancel Invitations

**`GET /api/v1/invitations?festivalId=X`** — list pending invitations for a festival (OWNER/ADMIN only)

**`DELETE /api/v1/invitations/[id]`** — cancel pending invitation (OWNER/ADMIN only)

### Files: Phase 3

**New:**
- `src/app/api/v1/invitations/route.ts`
- `src/app/api/v1/invitations/[id]/route.ts`
- `src/app/invite/[token]/page.tsx`
- `src/features/invitation/actions/invitation.actions.ts`
- `src/features/invitation/hooks/use-invitations.ts`

**Modify:**
- `src/features/members/services/member.service.ts` — add check for members feature flag before adding
- `src/config/plan-features/services/features.ts` — ensure hasFeatureEnabled covers "members"
- `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` — add "Invite Member" button for ADMIN/OWNER when members feature enabled

**Verify Phase 3:**
- [ ] OWNER sends invitation → pendingInvitation record created
- [ ] Invite link printed in terminal (dev mode)
- [ ] Click invite link when logged out → redirects to magic link with correct email pre-filled
- [ ] Click invite link when logged in but no onboarding → runs onboarding, then joins festival
- [ ] Click invite link when already a member → error shown
- [ ] Accept invitation → festival_member record created, redirected to /dashboard/[slug]
- [ ] OWNER can list pending invitations
- [ ] OWNER can cancel pending invitation
- [ ] Invitation expires after 48 hours
- [ ] Reusing expired token → error "Invalid or expired link"
- [ ] npm run lint — zero warnings
- [ ] npm run typecheck — zero errors

---

## Phase 4: Cleanup

### 4-A: Remove Password Code

- Remove `src/core/auth/password.ts`
- Remove `src/core/database/schema/password_reset_token.ts` usage
- Verify no remaining `bcrypt` imports anywhere
- User migration: DROP COLUMN `password` from `user` table (run as separate migration)

### 4-B: Deprecate Old Routes

- Confirm no callers remain for `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Remove or mark as deprecated in API docs

### 4-C: Middleware Review

- Verify middleware CSRF handling still works without password forms
- `/magic-link` and `/invite/[token]` pages should be CSRF-exempt (no form submissions)

### Files: Phase 4

**Remove:**
- `src/core/auth/password.ts`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`

**Verify Phase 4:**
- [ ] No `bcrypt` imports in codebase
- [ ] No `/api/auth/login` route handlers
- [ ] npm run lint — zero warnings
- [ ] npm run typecheck — zero errors

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

Each phase is independently verifiable before moving to the next.

---

## Migration Notes

| Legacy Item | Handling |
|-------------|----------|
| `user.password` column | Keep, ignore. Drop in Phase 4 migration. |
| `password_reset_token` table | Keep. Deprecated. |
| Existing sessions | Still valid until expiry (JWT unchanged). |
| Existing users without `accountType` | Treated as PERSONAL, `institutionId = null`. |
| Existing festivals | `institutionId = null`, `festivalType = 'INDEPENDENT'`. |
| Existing `user.age` data | Keep column (not used in new flow). |

---

## Dependencies

- Phase 2 depends on Phase 1 (auth must work before onboarding)
- Phase 3 depends on Phase 1 + 2 (needs auth + user records)
- Phase 4 depends on Phase 1 + 2 + 3

---

## Out of Scope (for this issue)

- Festival category planning for Islamic institutions (separate issue)
- Email template designs (content only — technical integration is this issue)
- Razorpay payment flow changes
- Super admin analytics changes
- Any changes to RBAC logic (festival roles stay as-is)
- Feature flags or tier changes
