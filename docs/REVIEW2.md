# 🔍 Greenroom — Final Code Review (Round 2)

> Generated after Round 1 (REVIEW.md) was fully resolved — Feb 2026.
> Work through top-to-bottom. Items marked `[x]` are fixed and committed.

---

## 🔴 Critical / High Priority

- [ ] **SEC-6** | `member.service.ts` — New users created with a hardcoded temp password `"ChangeMe123!"`. This is never emailed to the user, so they have no way to log in or change it. A password reset flow should be triggered instead.
  - **File:** `src/server/services/member.service.ts` L27
  - **Fix:** After creating the user, call `forgotPasswordAction(email)` (or the underlying token + email service directly) so the user receives a set-password link.

---

## 🟠 High Priority

- [ ] **BUG-3** | Services throw raw `Error` instead of `AppError` — these bypass `handleActionError`'s friendly formatting and fall through to the generic `error.message` branch, leaking internal strings like `"Festival expired"`, `"Invalid Group"`, etc., to the client.
  - **Files (all):**
    - `src/server/services/student.service.ts` — 8 raw throws
    - `src/server/services/category.service.ts` — 7 raw throws
    - `src/server/services/group.service.ts` — 4 raw throws
    - `src/server/services/member.service.ts` — 2 raw throws
    - `src/server/services/programme.service.ts` — 3 raw throws
    - `src/server/services/assignment.service.ts` — 15+ raw throws
    - `src/server/services/usage-counter.service.ts` — 2 raw throws
  - **Fix:** Add `import { AppError, ERROR_MESSAGES } from "@/lib/errors"` to each service and replace every `throw new Error(...)` with `throw new AppError(ERROR_MESSAGES.xxx)`. Add any missing constants to `ERROR_MESSAGES` (see QA-4 for the new keys needed).

- [ ] **BUG-4** | `category.service.ts` — `TIER_CATEGORY_LIMITS` is a hardcoded duplicate of `TIER_CONFIG`. When tier limits change in `pricing.ts` these won't update automatically.
  - **File:** `src/server/services/category.service.ts` L13–17
  - **Fix:** Remove `TIER_CATEGORY_LIMITS`. Use `TIER_CONFIG[festival.tier].limits.categories` (add a `categories` limit to `TierConfig` in `pricing.ts`, e.g. BASIC: 5, STANDARD: 10, PRO: 50).

---

## 🟡 Medium Priority — Code Quality

- [ ] **QA-4** | `catch (error: any)` still present in 5 action files. Breaks type safety and prevents `handleActionError` from getting typed errors properly.
  - **Files:**
    - `src/server/actions/user-festival.actions.ts` L57
    - `src/server/actions/student.actions.ts` L164
    - `src/server/actions/member.actions.ts` L22, L32
    - `src/server/actions/billing.actions.ts` L94, L147
  - **Fix:** Replace `catch (error: any)` with `catch (error: unknown)` and replace any raw `error.message` access with `handleActionError(error)`.

- [ ] **QA-5** | `ActionResponse<any>` generic still present in 4 action signatures. Should be typed to the actual return shape.
  - **Files:**
    - `src/server/actions/user-festival.actions.ts` L30
    - `src/server/actions/profile.ts` L23
    - `src/server/actions/payment.actions.ts` L22, L105
  - **Fix:** Replace `ActionResponse<any>` with the concrete type (e.g. `ActionResponse<Festival>`, `ActionResponse<Payment>`, etc.).

- [ ] **QA-6** | `(existing as any)._count` pattern used in `programme.service.ts` L170 and `category.service.ts` L88, `group.service.ts` L101. These rely on a Prisma `_count` include that is never requested in the fetch, so the value is always `undefined`, making the guard a no-op.
  - **Files:** `programme.service.ts`, `category.service.ts`, `group.service.ts`
  - **Fix:** Pass `include: { _count: { select: { assignments: true } } }` (etc.) in the `findById` model function, or do an explicit `prisma.X.count({ where: { programmeId: id } })` before delete. Remove the `as any` cast.

- [ ] **QA-7** | Residual `any` types in infrastructure files.
  - `src/server/services/audit-log.service.ts` L50 — `let whereClause: any = {}`
  - `src/server/models/festival.model.ts` L92 — `standings: any`
  - `src/server/actions/team.actions.ts` L98 — `const whereClause: any`
  - `src/server/actions/results.ts` L155 — `standings: any[]`
  - `src/server/loader/festivalPublic.ts` L18, L24 — `branding: any`, `teamStandings: any`
  - `src/server/services/assignment.service.ts` L416 — `as any` cast on pushed item
  - **Fix:** Replace with proper types (use `Prisma.FestivalWhereInput` for whereClauses, define `StandingsEntry` interface for standings, etc.).

---

## 🟢 Low Priority — Cleanup

- [ ] **CLN-3** | `TODO` comments that should be resolved or tracked as issues.
  - `src/server/services/student.service.ts` L64 — `// TODO: Handle Decrement usage counter on failure` — the usage counter is incremented before create; a failure leaves a skewed counter. Wrap the increment + create in a single `$transaction`.
  - `src/server/actions/assignment.actions.ts` L11 — `// TODO: Add filtering if needed for other roles` — decide and implement or remove.
  - `src/server/actions/admin-user.actions.ts` L15 — `// TODO: Add strict role check` — either add the middleware guard or add `if (session.role !== "SUPER_ADMIN") throw new AppError(ERROR_MESSAGES.FORBIDDEN)` inline.

- [ ] **CLN-4** | `member.service.ts` — `findMemberById` and `deleteMember` imported via dynamic `import()` inside `removeMember`. No circular dependency risk here; static import at the top is cleaner.
  - **File:** `src/server/services/member.service.ts` L54–55
  - **Fix:** Move to static top-level imports.

- [ ] **CLN-5** | `programme.service.ts` — `getDetails` imports `findProgrammeWithAssignments` via dynamic `import()` for "circular dep" safety but the comment is speculative. Verify imports and use a static import if safe.
  - **File:** `src/server/services/programme.service.ts` L20–22

---

## ⏸️ Deferred (Requires Design Decision)

- [ ] **DEFER-3** | `AdminUser.actions.ts` — action has a TODO for SUPER_ADMIN role check but says "not already handled by middleware/layout." Verify middleware chain — if not guaranteed, add the guard. If guaranteed, add a comment referencing exactly which middleware.

- [ ] **DEFER-4** | `billing.actions.ts` — uses `catch (error: any)`. May have specific Razorpay error shapes that need custom handling beyond `handleActionError`. Investigate before blindly normalizing.

---

## Progress Summary

| Category | Total | Done | Remaining |
|---|---|---|---|
| 🔴 Critical Security | 1 | 0 | 1 |
| 🟠 High Priority | 2 | 0 | 2 |
| 🟡 Medium (Code Quality) | 4 | 0 | 4 |
| 🟢 Low (Cleanup) | 3 | 0 | 3 |
| ⏸️ Deferred | 2 | 0 | 2 |
| **Total** | **12** | **0** | **12** |
