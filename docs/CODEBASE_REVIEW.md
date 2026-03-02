# Greenroom – Codebase Review (Problems Identified)

Review by area: **Layout**, **Authentication & Authorization**, **Core User Workflows**, **Backend Patterns**, **Feature Flags & Tiers**, **Config**. Each item is a concrete, actionable problem.

---

## 1. Layout

### 1.1 Double `QueryProvider`

- **Where:** Root `src/app/layout.tsx` wraps with `QueryProvider`; `src/app/dashboard/[slug]/layout.tsx` wraps again with `QueryProvider`.
- **Problem:** Nested React Query providers create separate client instances. Dashboard pages get the inner one; other pages use the root one. Cache is not shared, and behavior can be inconsistent.
- **Fix:** Use a single `QueryProvider` at root only; remove it from the dashboard layout.

### 1.2 `ThemeProvider` missing

- **Where:** `next-themes` is in `package.json` and `src/components/ui/sonner.tsx` uses `useTheme()` from `next-themes`.
- **Problem:** `ThemeProvider` is never mounted in the app. `useTheme()` can throw or behave incorrectly without a provider.
- **Fix:** Add `<ThemeProvider attribute="class" defaultTheme="system">` in root `layout.tsx` (or a shared layout that wraps all themed pages).

### 1.3 Dashboard layout: `storageUsedMB` placeholder

- **Where:** `src/app/dashboard/[slug]/layout.tsx` passes `usage.storageUsedMB: 0` to `DashboardRightSidebar`.
- **Problem:** Usage display is wrong; storage is never computed or passed from DB.
- **Fix:** Either compute/persist `festival.storageUsedMB` and pass it, or remove the field from the UI until implemented.

### 1.4 Public layout: no auth or metadata

- **Where:** `src/app/(public)/layout.tsx` only renders Navbar + children + Footer.
- **Problem:** No `metadata` export; no distinction between public and unauthenticated. Fine if intentional, but worth documenting.
- **Fix:** Add metadata if needed; document that (public) is for marketing and does not require auth.

### 1.5 Festival public layout: branding `as any`

- **Where:** `src/app/(festivalPublic)/[slug]/layout.tsx` uses `(festival.branding as any).colors?.primary`, `.logo`, `.heroImage`.
- **Problem:** Type safety lost; schema for `branding` is not enforced.
- **Fix:** Define a `FestivalBranding` type (or use Prisma `JsonValue` + type guard) and use it instead of `any`.

---

## 2. Authentication & Authorization

### 2.1 Session role type is string

- **Where:** `SessionPayload` in `src/lib/auth/session.ts` has `role: string`; layouts compare `session.role === "SUPER_ADMIN"`.
- **Problem:** Typos (e.g. `"SUPER_ADMIN"` vs `"SUPERADMIN"`) are not caught; no shared enum.
- **Fix:** Use a union type or enum for role (e.g. `"USER" | "SUPER_ADMIN"`) and use it in session and checks.

### 2.2 JWT secret at module load

- **Where:** `src/lib/auth/session.ts`: `const secretKey = process.env.JWT_SECRET` at top level.
- **Problem:** If `JWT_SECRET` is missing, `encrypt`/`decrypt` throw; but key is read once at load. Edge or serverless can cache that.
- **Fix:** Prefer reading inside the function or ensure deployment always sets `JWT_SECRET` and document it.

### 2.3 Two different `getCurrentUser` implementations

- **Where:**  
  - `src/lib/auth/current-user.ts`: returns full User from DB (used by overview layout, profile).  
  - `src/server/actions/user.actions.ts`: returns session object (not full user), same name `getCurrentUser`.
- **Problem:** Same name, different return types and semantics. Anyone importing from `user.actions` gets session, not user.
- **Fix:** Rename `user.actions.getCurrentUser` to e.g. `getSessionFromAction` or remove it and use `getSession()` from `lib/auth/session` everywhere.

### 2.4 Register does not create session

- **Where:** `registerAction` in `src/server/actions/auth.actions.ts` creates user and returns data but does not call `createSession`.
- **Problem:** After sign-up, user is not logged in; they must open login and sign in again. Comment in code says “keeping behavior same as API route.”
- **Fix:** Either auto-login after register (call `createSession`) for better UX, or document that “register does not log in” and ensure UI copy reflects that.

### 2.5 Admin layout redirect when unauthorized

- **Where:** `src/app/(admin)/layout.tsx`: if not session or not SUPER_ADMIN, redirects to `/profile`.
- **Problem:** If user is not logged in, they are sent to `/profile`; (overview) layout then redirects to `/login`. One extra redirect and URL flash.
- **Fix:** If `!session`, redirect to `/login`; if session but not SUPER_ADMIN, redirect to `/profile`.

### 2.6 Server actions: no festival access check

- **Where:** Many actions take `festivalId` and only check session and that festival exists, e.g.:
  - `getStudentsAction(festivalId)` – no session or membership check; returns any festival’s students.
  - `createStudentWithServiceAction`, `updateStudentAction`, etc. – check session + festival existence but not owner/member.
- **Problem:** Layout protects dashboard by slug, but actions are callable with any `festivalId`. A logged-in user (or forged request) could read/update another festival’s data if they know IDs.
- **Fix:** For every action that takes `festivalId`, ensure the current user is owner or an active `FestivalMember` for that festival (or SUPER_ADMIN). Add a shared helper e.g. `assertFestivalAccess(session, festivalId)` and use it in all such actions.

### 2.7 Read-only actions with no auth

- **Where:** `getStudentsAction` only does `return StudentService.getAll(festivalId)`.
- **Problem:** Unauthenticated or arbitrary users can list students for any festival by ID.
- **Fix:** Add session check and festival access check (owner/member/SUPER_ADMIN) before calling the service.

---

## 3. Core User Workflows

### 3.1 Two payment creation paths

- **Where:**  
  - **A)** `POST /api/payments/create-order` → `PaymentController.createOrder` → `payment.model.createPayment` (no `tier`/`purpose` in model; controller uses BASIC and does not pass tier).  
  - **B)** Server action `initiateFestivalPayment(tier)` → creates payment with `tier` and `purpose: FESTIVAL_CREATION`.
- **Problem:** API path creates payments without tier; create-festival flow expects PAID payment with purpose and tier. `FestivalAccessCard` uses the API flow but is not used anywhere; main UI uses server action. Two code paths and possible confusion.
- **Fix:** Prefer one path: use server action + Razorpay for all festival payments. Deprecate or remove `POST /api/payments/create-order` and `FestivalAccessCard` (or refactor card to use the action), and ensure all payment creation goes through the action so tier/purpose are always set.

### 3.2 Payment controller vs payment actions

- **Where:** `PaymentController.createOrder` uses `getActivePaymentForUser`, `RazorpayService.createOrder`, and `createPayment` from `payment.model`, which does not accept `tier` or `purpose`.
- **Problem:** Payment records created via controller lack tier; validity/display may be wrong. Schema has `tier` and `purpose`; model’s `createPayment` does not set them.
- **Fix:** If keeping the API route, extend `createPayment` to accept and persist `tier` and `purpose`; otherwise remove the API path and use only the action.

### 3.3 useFestivalPayment passes string tier

- **Where:** `useFestivalPayment` calls `handlePay(tier)`; OverviewTab uses `handlePayClick(basicTier.id)` (e.g. `"BASIC"`). `initiateFestivalPayment` expects `Tier` (enum).
- **Problem:** If a non-Tier string is passed (e.g. from a different tier object), type safety and backend validation may be bypassed.
- **Fix:** Ensure tier comes from a typed source (e.g. `PRICING_TIERS` with `id: Tier`) and type the hook as `(tier: Tier)`.

### 3.4 Verify payment: no ownership check

- **Where:** `verifyFestivalPayment(paymentId, razorpayPaymentId, razorpaySignature)` looks up payment by `paymentId` only.
- **Problem:** In theory, a user could try to verify another user’s payment if they guess or obtain the payment ID. Razorpay signature ties to order/payment, but server should also ensure `payment.userId === session.userId`.
- **Fix:** After loading the payment, assert `payment.userId === session.userId` (or equivalent) before updating status.

---

## 4. Backend Patterns

### 4.1 Inconsistent error responses from API routes

- **Where:** e.g. `src/app/api/auth/login/route.ts`: on ZodError returns `{ error: (error as any).errors }` (raw Zod issues); other routes return `{ error: "string" }`.
- **Problem:** Client must handle both shapes; raw Zod output can be verbose and inconsistent.
- **Fix:** Normalize API error shape (e.g. `{ error: string, code?: string, fields?: Record<string, string> }`) and map Zod to a user-facing message + optional fields.

### 4.2 Duplicate Razorpay initialization

- **Where:** `src/server/actions/payment.actions.ts` and `src/server/actions/billing.actions.ts` both do `new Razorpay({ key_id, key_secret })`.
- **Problem:** Duplication; if one is updated (e.g. env names), the other can drift. Same for payment creation logic.
- **Fix:** Use a single `RazorpayService` (or shared module) for creating orders and centralize env and options.

### 4.3 Action return type consistency

- **Where:** Some actions return `ActionResponse<T>` with `success`/`data`/`error`/`fields`; others may return raw data or throw.
- **Problem:** Clients may assume a consistent shape; mixing patterns makes handling harder.
- **Fix:** Document and stick to one convention (e.g. all actions return `ActionResponse<T>`; throw only for unexpected errors), and ensure `handleActionError` is used everywhere.

### 4.4 revalidatePath with literal path

- **Where:** e.g. `student.actions.ts`: `revalidatePath(\`/festival/${festivalId})`but app route is`dashboard/[slug]`, not` festival/[id]`.
- **Problem:** Revalidation may not hit the actual dashboard route; cache can stay stale.
- **Fix:** Use the real path pattern, e.g. revalidate by slug or use `revalidateTag` for festival data.

### 4.5 Prisma `$transaction` and external calls

- **Where:** Generally actions use Prisma and some call external services (e.g. Razorpay).
- **Problem:** If Razorpay is called inside a Prisma `$transaction`, the transaction is held open during network I/O; not observed in current snippets but worth avoiding.
- **Fix:** Keep transactions short; do payment provider calls outside the transaction and then update DB.

---

## 5. Feature Flags & Tiers

### 5.1 Null tier and `TIER_CONFIG` access

- **Where:**  
  - `UsageCounterService.incrementUsage`: `const limits = TIER_CONFIG[festival.tier].limits` – `festival.tier` can be `null`.  
  - Dashboard layout: `TIER_CONFIG[festival.tier || "STANDARD"]` – safe.  
  - `FeatureService.isFeatureEnabled(festival.tier as any, ...)` in several pages – tier can be null.
- **Problem:** `TIER_CONFIG[null]` is `undefined`; `.limits` throws. Feature checks with null tier rely on `TIER_CONFIG[tier]?.features` and fallback to false, but the cast hides the issue.
- **Fix:** In usage-counter (and anywhere else), use `TIER_CONFIG[festival.tier ?? "STANDARD"]` (or a shared helper). Type tier as `Tier | null` and always coerce to a default (e.g. `"STANDARD"`) before indexing `TIER_CONFIG`.

### 5.2 Repeated `festival.tier as any` for feature checks

- **Where:** `src/app/dashboard/[slug]/settings/page.tsx`, `members/page.tsx`, `stage-management/page.tsx`, `(festivalPublic)/[slug]/page.tsx` use `FeatureService.isFeatureEnabled(festival.tier as any, "…")`.
- **Problem:** `any` hides null/undefined; if tier is null, `FeatureService` returns false (via `?.features`), but type contract is unclear.
- **Fix:** Add a helper e.g. `getTierForFeatureCheck(tier: string | null): Tier` that returns a default, and call `FeatureService.isFeatureEnabled(getTierForFeatureCheck(festival.tier), "…")` so no `as any` is needed.

### 5.3 Feature list and config can drift

- **Where:** `FeaturePath` in `lib/features.ts` is a long union; `TIER_CONFIG` features are a large object. Adding a new feature requires updating both.
- **Problem:** Easy to add a key to config and forget to add it to `FeaturePath`, or the other way around.
- **Fix:** Derive `FeaturePath` from config type (e.g. `keyof TierFeatures`) or add a test that asserts every config feature key is in the union.

---

## 6. Config

### 6.1 Dead flag in `lib/config.ts`

- **Where:** `systemConfig.paymentFirstFlowEnabled: false` in `src/lib/config.ts`.
- **Problem:** No references in codebase; flag has no effect. Either the flow is always “payment first” now or the flag was never wired.
- **Fix:** Remove the flag, or implement a real toggle (e.g. show payment-first vs legacy create-then-pay) and use it in the UI/routing.

### 6.2 Env used at module load

- **Where:** `JWT_SECRET` in session; `RAZORPAY_KEY_`* in payment/billing actions; `DATABASE_URL` in `lib/db.ts`.
- **Problem:** In serverless/edge, top-level access can run at cold start; missing env can fail at import time. Less of an issue if all env is set in deployment.
- **Fix:** Document required env in README and deployment; optionally validate env in a single startup step instead of scattering checks.

### 6.3 Razorpay keys fallback to empty string

- **Where:** `new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID || "", key_secret: process.env.RAZORPAY_KEY_SECRET || "" })`.
- **Problem:** Empty string can make Razorpay fail in a hard-to-debug way (e.g. at first API call).
- **Fix:** Throw at startup or at first use if keys are missing, with a clear message (e.g. “RAZORPAY_KEY_ID is required”).

---

## Summary Table


| Area             | Severity | Count | Main issues                                                                 |
| ---------------- | -------- | ----- | --------------------------------------------------------------------------- |
| Layout           | Medium   | 5     | Double QueryProvider, missing ThemeProvider, placeholders, `as any`         |
| Auth & Authz     | High     | 7     | Two getCurrentUser, no festival access in actions, getStudentsAction unauth |
| Workflows        | Medium   | 4     | Two payment paths, verify ownership, tier typing                            |
| Backend patterns | Medium   | 5     | Error shape, duplicate Razorpay, revalidatePath, transactions               |
| Feature flags    | Medium   | 3     | Null tier in TIER_CONFIG, `as any`, config/type drift                       |
| Config           | Low      | 3     | Dead flag, env at load, empty Razorpay keys                                 |


**Highest priority:**  

- Fix server action authorization (festival access + auth on read actions).  
- Unify payment flow and ensure tier/purpose on all payment records.  
- Remove duplicate QueryProvider and add ThemeProvider.  
- Harden tier handling (null/default) and remove `TIER_CONFIG[festival.tier]` when tier can be null.

