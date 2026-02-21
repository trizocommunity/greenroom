# 🔍 Greenroom — Code Review & Fix Tracker

> Generated from senior full-stack code review (Feb 2026).
> Work through this file top-to-bottom. Each item is clearly scoped and tested.
> Items marked `[x]` are confirmed fixed and committed.

---

## 🔴 Critical Security Fixes

These are production-blocking. Fix before any new feature work.

- [x] **SEC-1** | `getAllTicketsAction` — No SUPER_ADMIN guard. Any logged-in user can list all tickets.
  - **File:** `src/server/actions/support.actions.ts`
  - **Fix:** Add `if (session.role !== "SUPER_ADMIN") throw new AppError(ERROR_MESSAGES.FORBIDDEN);`

- [x] **SEC-2** | `updateTicketStatusAction` — Same as above. No auth guard at all.
  - **File:** `src/server/actions/support.actions.ts`
  - **Fix:** Same SUPER_ADMIN guard addition.

- [x] **SEC-3** | `getTicketDetailsAction` — `isOwner` computed but never enforced (empty if-block). Any user can spy on any ticket by ID.
  - **File:** `src/server/actions/support.actions.ts`
  - **Fix:** Enforce the check — allow access only if `isOwner` OR `SUPER_ADMIN`.

- [x] **SEC-4** | `sendMessageAction` — Sender role inferred from "not the ticket owner" instead of session. Any user can post admin messages on tickets they don't own.
  - **File:** `src/server/actions/support.actions.ts`
  - **Fix:** Derive `senderType` from `session.role`, throw FORBIDDEN if not owner/admin.

- [x] **SEC-5** | `markNotificationAsReadAction` — No ownership check. Any user can mark anyone's notifications as read.
  - **File:** `src/server/actions/support.actions.ts`
  - **Fix:** Add `where: { id: notificationId, userId: session.userId }` to the update.

---

## 🟠 High Priority Fixes

- [x] **BUG-1** | `createStudentAction` (legacy) — Hardcoded `limit = 1000`, completely ignores tier config.
  - **File:** `src/server/actions/student.actions.ts` L268
  - **Fix:** Replaced with `TIER_CONFIG[festival.tier].limits.students` with a user-friendly error message.

- [x] **BUG-2** | Password reset email was a dead code stub. `resetUrl` was generated but never sent.
  - **Files:** `src/lib/email.ts` (new), `src/server/actions/auth.actions.ts`
  - **Fix:** Installed `resend`. Created `src/lib/email.ts` with `sendPasswordResetEmail` (branded HTML template, dev console fallback if `RESEND_API_KEY` is missing). Wired into `forgotPasswordAction`.
  - **Env required:** `RESEND_API_KEY`, optionally `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`.

---

## 🟡 Medium Priority — Code Quality

- [x] **QA-1** | Legacy `createStudentAction` (FormData-based) co-exists with new `createStudentWithServiceAction`.
  - **File:** `src/server/actions/student.actions.ts`
  - **Fix:** Confirmed zero external callers. Deleted ~150 lines: legacy schema, `createStudentAction`, and `deleteStudentAction`.

- [x] **QA-2** | Replace `any` types: session payload, pricing config, action responses.
  - **Files:** `session.ts` — added `SessionPayload` interface, all functions now properly typed.
  - `admin.actions.ts` — `data: any` → `Record<string, unknown>`, `catch error: any` → `error: unknown`.
  - `BulkUploadProgrammesModal.tsx` — typed result narrowing via cast.

- [x] **QA-3** | Inconsistent error pattern — standardized `AppError` across all action files.
  - **Files:** `stage.actions.ts`, `assignment.actions.ts`, `admin.actions.ts`, `programme.actions.ts`, `chest-number.actions.ts`.
  - All `throw new Error(...)` in actions replaced with `throw new AppError(...)` or `throw new AppError(ERROR_MESSAGES.xxx)`.
  - All `catch (error: any)` replaced with `catch (error: unknown)` + `handleActionError(error)`.

---

## 🟢 Low Priority — Cleanup

- [x] **CLN-1** | `festival.actions.ts` — Double `programmeAssignmentDeadline` assignment in update (first one is dead code overwritten by the spread).
  - **File:** `src/server/actions/festival.actions.ts` L153–161

- [x] **CLN-2** | `resetChestNumbers` — First `revalidatePath` used `festivalId` instead of slug. Added `AppError` import. Fetch slug first, revalidate once correctly.
  - **File:** `src/server/actions/chest-number.actions.ts` L211

---

## ⏸️ Deferred (After BASIC Plan Completion)

- [x] **DEFER-1** | Complete `STANDARD` tier feature flags in `TIER_CONFIG`.
  - **File:** `src/config/pricing.ts`
  - **Fix:** Added full `features` block with 35+ flags at the STANDARD tier level: stage management, scheduling, bulk uploads, QR codes, auto-certificates, full landing page, custom URL/colors, live scoreboard, 3-member team. Also added `TierFeatures`, `TierLimits`, `TierConfig` interfaces — replaced `Record<Tier, any>` with `Record<Tier, TierConfig>`.

- [x] **DEFER-2** | Complete `PRO` tier feature flags in `TIER_CONFIG`.
  - **File:** `src/config/pricing.ts`
  - **Fix:** Added full `features` block — all features enabled: RBAC, advanced analytics, custom reports, certificate builder, bulk certs, landing page builder, custom domain, white-label, API access, webhooks, live results, multi-festival management, 10-member teams, 4h priority support SLA, 90-day post-expiry full data retention. Uncommented both STANDARD and PRO entries in `PRICING_TIERS` with descriptive feature lists.

---

## Progress Summary

| Category | Total | Done | Remaining |
|---|---|---|-----------|
| 🔴 Critical Security | 5 | 5 | 0 |
| 🟠 High Priority | 2 | 2 | 0 |
| 🟡 Medium (Code Quality) | 3 | 3 | 0 |
| 🟢 Low (Cleanup) | 2 | 2 | 0 |
| ⏸️ Deferred | 2 | 2 | 0 |
| **Total** | **14** | **14** | **0** |
