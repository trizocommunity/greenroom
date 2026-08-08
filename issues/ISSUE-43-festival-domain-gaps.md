# Festival Domain — Silent-Default & Contract-Divergence Cleanup

## Status

- **Created**: 2026-08-07
- **Status**: Planned — not yet started
- **Priority**: High (PRO→STANDARD bug already in production; same bug class lives in ≥6 other places)
- **Complexity**: High
- **Target**: Production
- **Phasing**: 5 PRs (see §6 below) — proposed ordering
- **Blocks**: any future festival-domain change; further Feature Gate work; correct tier resolution in dashboard pages; EXPIRED-lifecycle features; backfill of wrong-tier festivals
- **Internal dependency**: §1 (Silent defaults) is independent; §2 (Contract split) unblocks safe refactors in §3–§5

## Summary

A focused audit of the festival domain surfaced ~50 gaps grouped into 10 clusters (A through J). The most urgent are a **silent-default bug class** that mirrors the PRO→STANDARD bug the team just caught manually, a **three-way contract divergence** between the API contract / form schema / server action, and a **live HTTP route that re-implements festival creation without payment validation** (the actual broken path). Several audit-log and lifecycle-policy gaps are also compliance-sensitive.

This issue consolidates all clusters into one tracking document with five phased PRs. Each PR is independently shippable.

## Locked Decisions

| #  | Question                                  | Decision |
|----|-------------------------------------------|----------|
| 1  | One issue or one-per-cluster?             | **One tracking issue**, 5 phased PRs |
| 2  | Approach to silent DB defaults (§A)       | **Make NOT NULL + remove defaults** where the bug has shipped; audit-log otherwise |
| 3  | Approach to contract split (§B)           | **Single source of truth** — form-schema Zod, server action validates, API contract removed |
| 4  | `POST /api/v1/festivals` route            | **Delete** — no consumer after the PRO fix lands |
| 5  | `PUT /api/v1/festivals/[id]` route        | **Delete** — the live "Edit festival details" dialog is rewired to `updateFestivalSettingsAction` |
| 6  | `DELETE /api/v1/festivals/[id]` route     | **Keep**, but route through `deleteFestivalAdmin` so the typed `reason` lands in the audit log |
| 7  | `relaunchFestival` server action          | **Delete** — current Relaunch UI goes through `createFestival` |
| 8  | `user-festival.actions.ts`                | **Delete** — superseded by `updateFestivalSettingsAction` + new contract |
| 9  | `festival-live.actions.ts`                | **Delete** — superseded by `media.actions.ts` + `news.actions.ts` |
| 10 | `expired-festival.actions.ts`             | **Delete** — live UI hits the API route directly |
| 11 | Member server actions                     | **Delete** `addMemberAction`, `getMembersAction`, `removeMemberAction` |
| 12 | Super-admin festival actions              | **Keep** `freezeFestivalAdmin`; delete `deleteFestivalAdmin`/`updateFestivalAdmin`/`getFestivalAdmin` orphans |
| 13 | Dead hooks                                | **Delete** `useAddMember`, `useFestival(id)` |
| 14 | Tier fallback strategy                    | **Single helper** `getResolvedTier` everywhere — removes 5+ ad-hoc fallbacks |
| 15 | EXPIRED transition                        | **Wire** `getFestivalsToExpire` into the existing cron — flags it as required fix |
| 16 | Audit actions that aren't in the union    | **Add to union** (`FREEZE_FESTIVAL`, `DELETE_FESTIVAL_ADMIN`) then route through `createAuditLog` |
| 17 | Race fixes                                | Wrap `MemberService.addMember`, `setPlanFeatureTagOverrideAction`, and `updateFestivalAdmin` audit-write in transactions |
| 18 | "Plan" vs "Tier" naming                   | **Defer** — follow-up cosmetic ticket; pricing-page "plan" copy stays |
| 19 | Tests                                     | Add regression test for the PRO→STANDARD bug as part of §1 |
| 20 | Backfill of already-wrong-tier festivals  | **Separate ticket** — out of scope here |

---

# §1 — Silent Defaults + Regression Test (PR 1)

The bug class the team just caught manually. Make the database scream when a path forgets a column, and add the test that would have caught it.

## Problem

`festival.tier` defaults to `"STANDARD"` (`src/core/database/schema.ts:469`). Any INSERT that omits `tier` silently gets STANDARD instead of failing loudly. The live `POST /api/v1/festivals` HTTP route relied on this default, producing the PRO→STANDARD bug. Six other columns share the same shape.

## Gaps fixed in this section

- **A1** `festival.tier` default `"STANDARD"` — `src/core/database/schema.ts:469`
- **A2** `festival.isLocked` default `true` — `:456`
- **A3** `festival.status` default `"READY"` vs `createFestival` writes `"ONGOING"` — `:489` vs `src/features/festivals/actions/festival-crud.actions.ts:104`
- **A4** `festival.expiresAt` nullable — `:460`
- **A5** `festivalMember.role` default `"ANNOUNCER"` — `:1736`
- **A6** `payment.tier` nullable + no default — `:1858`
- **A7** `publicSiteEnabled` default `false` — `:475`
- **I** regression test for PRO→STANDARD

## Plan

1. Migration `0043_remove_silent_defaults.sql`:
   - `ALTER TABLE festival ALTER COLUMN tier DROP DEFAULT;` (keep NOT NULL).
   - `ALTER TABLE festival ALTER COLUMN "isLocked" DROP DEFAULT;` (keep NOT NULL).
   - `ALTER TABLE festival ALTER COLUMN status DROP DEFAULT;` (keep NOT NULL).
   - `ALTER TABLE festival ALTER COLUMN "publicSiteEnabled" DROP DEFAULT;` (keep NOT NULL).
   - `ALTER TABLE payment ALTER COLUMN tier SET NOT NULL;` — backfill any NULLs to `"BASIC"` first (matches current fallback in `festival-crud.actions.ts:60`).
   - `ALTER TABLE festival ALTER COLUMN "expiresAt" SET NOT NULL;` — backfill `now() + interval '90 days'` for any rows with NULL.
   - `ALTER TABLE "festivalMember" ALTER COLUMN role SET DEFAULT 'MEMBER';` (admin role still set explicitly by callers).
2. Update Drizzle schema (`src/core/database/schema.ts`) and regenerate migration.
3. Add `feature-gate.test.ts` regression test:
   ```ts
   it("PRO payment → festival.tier=PRO", async () => {
     const payment = await createPaidPayment({ tier: "PRO", purpose: "FESTIVAL_CREATION" });
     const festival = await callCreateFestival({ paymentId: payment.id, ... });
     expect(festival.tier).toBe("PRO");
     expect(festival.tierLabel).toBe("Pro");
     expect(payment.used).toBe(true);
     expect(payment.festivalId).toBe(festival.id);
   });
   // + STANDARD → STANDARD, BASIC → BASIC, null-tier legacy → BASIC fallback
   ```

## Acceptance

- New migration applies cleanly; existing rows are backfilled.
- Lint, typecheck, test pass.
- The PRO→STANDARD regression test fails on the broken code path and passes on the fixed path (verified by reverting the fix locally and running the test).

---

# §2 — Contract/Schema Split (PR 2)

Three different shapes for the same concept. Pick one and delete the rest.

## Problem

- `createFestivalInput` (API contract) missing `paymentId` — root cause of the PRO→STANDARD bug (`src/api/contracts/festivals.ts:24-34`).
- `updateFestivalInput` (API contract) ≠ `updateFestivalSchema` (form) ≠ `updateFestivalSettingsAction` (server action).
- `festivalSchema.status` enum (`DRAFT/PUBLISHED/ARCHIVED/EXPIRED`) doesn't match the DB enum (`READY/ONGOING/PAST/EXPIRED`) — every GET deserializes against the wrong shape.
- `institutionType` API contract is `z.string()` instead of the DB enum.
- `tier` nullable in API contract but NOT NULL in DB.
- `teamLeaderLimit` DB-clamped `[1,10]` but server action bypasses Zod.

## Gaps fixed in this section

- **B1, B2, B3, B4, B5, B6** (contract mismatches)
- **G1, G2, G3** (inconsistent tier resolution)

## Plan

1. Make the form-schema Zod (`src/features/festivals/schemas/festival.schema.ts`) the single source of truth for create + update.
2. Re-export it as `createFestivalContract` and `updateFestivalContract` from `src/api/contracts/festivals.ts` (re-export, not duplicate).
3. Fix `festivalSchema.status` to match DB enum: `["READY", "ONGOING", "PAST", "EXPIRED"]`.
4. Tighten `institutionType` to `z.nativeEnum(InstitutionType)`.
5. Make `tier` non-nullable in the contract.
6. Add `scoringSystem` and `chestNumberSettings` to `updateFestivalSchema`.
7. `updateFestivalSettingsAction` calls `updateFestivalSchema.parse(data)` at the top.
8. Normalize all `(festival.tier ?? "STANDARD") as any` to `getResolvedTier(festival.tier)` across the 8 dashboard pages.
9. Replace `festivalContext.tier === "BASIC"` with `isBasicTier(festivalContext.tier)` in the 6+ components.
10. `updateFestivalSettingsAction`: use `getResolvedTier(payment.tier)` instead of `payment.tier || "BASIC"`.

## Acceptance

- One Zod schema per concept. All API routes, server actions, and forms consume it.
- The 5 different tier fallback strategies collapse to one (`getResolvedTier`).
- `as any` casts around `tier` are gone.

---

# §3 — Live-Code Bugs in HTTP Routes (PR 3)

The two other HTTP routes do the same thing wrong as `POST /api/v1/festivals`, and one of them drops the typed `reason` from the delete UI.

## Problem

- `PUT /api/v1/festivals/[id]` accepts arbitrary fields, no allow-list, no `assertFestivalMutationAllowed` (`src/app/api/v1/festivals/[id]/route.ts:80-86`). The live "Edit festival details" dialog uses it.
- `DELETE /api/v1/festivals/[id]` silently discards the typed `reason` from `DeleteFestivalButton.tsx:72-75` and bypasses the audit log.
- `setPublicSiteEnabledAction` doesn't call `validatePublicSiteRequirements` even though the service is imported (`src/features/festivals/actions/festival-crud.actions.ts:335-387`).
- Slug uniqueness: `createFestival` server action has no pre-check, so collisions surface as a generic "unique constraint violated" instead of "subdomain taken".

## Gaps fixed in this section

- **C1, C2, C3, C4, C5, C6**

## Plan

1. **Delete** `POST /api/v1/festivals` route (D1) — no consumer after the PRO fix lands in PR 0.
2. **Delete** `PUT /api/v1/festivals/[id]` route — rewire `FestivalDetailsDialog.tsx:66` to call `updateFestivalSettingsAction` via the new `useUpdateFestivalSettings` hook (already exists at `src/api/client/server-actions.ts:720-752`).
3. **Keep** `DELETE /api/v1/festivals/[id]` but route through `deleteFestivalAdmin` so the typed `reason` lands in the audit log.
4. `setPublicSiteEnabledAction` — call `validatePublicSiteRequirements(festival)` before flipping.
5. `createFestival` server action — pre-check `festival.slug` uniqueness via `db.query.festival.findFirst` and throw a typed `SLUG_TAKEN` error if it exists. Map to a friendly toast in `FestivalSetupForm.tsx:192-196`.

## Acceptance

- Only `GET /api/v1/festivals` and `DELETE /api/v1/festivals/[id]` remain in `src/app/api/v1/festivals/`.
- "Edit festival details" dialog still works, but goes through the server action.
- Public-site toggle refuses to flip on an empty festival with a typed error.
- Slug collisions return a friendly "subdomain taken" toast.

---

# §4 — Dead-Code Cleanup (PR 4)

Big readability win. No behaviour change; just deletes.

## Plan

Delete these files / functions / hooks:

| Item | Path |
|---|---|
| `POST /api/v1/festivals` route | `src/app/api/v1/festivals/route.ts:23-41` (also PR 3) |
| `PUT /api/v1/festivals/[id]` route | `src/app/api/v1/festivals/[id]/route.ts:62-86` (also PR 3) |
| `relaunchFestival` action | `src/features/festivals/actions/festival-crud.actions.ts:476-588` |
| `festival-live.actions.ts` (entire file) | `src/features/festivals/actions/festival-live.actions.ts` |
| `user-festival.actions.ts` (entire file) | `src/features/festivals/actions/user-festival.actions.ts` |
| `expired-festival.actions.ts` (entire file) | `src/features/festivals/actions/expired-festival.actions.ts` |
| `addMemberAction`, `getMembersAction`, `removeMemberAction` | `src/features/members/actions/member.actions.ts:13-86` |
| `deleteFestivalAdmin`, `updateFestivalAdmin`, `getFestivalAdmin` | `src/features/admin/actions/admin.actions.ts:36-118, :157-163` |
| `FreezeFestivalModal` | `src/components/admin/FreezeFestivalModal.tsx` |
| `setPlanFeatureOverrideAction` | `src/features/plan-features/actions/plan-features.actions.ts:46-63` |
| `assertSuperAdmin` (no-op) | `src/features/plan-features/actions/plan-features.actions.ts:25-28` |
| `useAddMember` hook | `src/api/client/members.ts:23-44` |
| `useFestival(id)` hook | `src/api/client/festivals.ts:26-38` |
| `updateFestivalStandings` repo fn | `src/features/festivals/repositories/festival.repository.ts:158-175` |
| `revalidatePath('/dashboard/${slug}/festival-live')` calls | `src/features/festivals/actions/festival-crud.actions.ts:381, :453` |
| `validatePublicSiteRequirements` import | `src/features/festivals/actions/festival-crud.actions.ts:28` (re-added in PR 3) |
| `assertFestivalAccess` import | `src/features/announcement/actions/announcer.actions.ts:15` |

## Acceptance

- `grep -r "festival-live.actions" src/` returns nothing.
- `grep -r "useFestivalPayment\|relaunchFestival\|updateFestivalAction\|getMyFestival" src/` returns only the deleted files (audit pass).
- Typecheck + lint + tests pass.

---

# §5 — Audit + Lifecycle Compliance (PR 5)

Compliance + correctness fixes that depend on §2 and §3.

## Plan

1. **Audit-log coverage (E1–E9):**
   - `DELETE /api/v1/festivals/[id]` (now via `deleteFestivalAdmin`) writes `DELETE_FESTIVAL` with the typed `reason`.
   - `setPublicSiteEnabledAction`, `updateFestivalBrandingAction`, `updateFestivalSettingsAction` all call `createAuditLog` with appropriate actions.
   - Member add/remove/role-update writes `CREATE_MEMBER`/`REVOKE_MEMBER`.
   - News + media mutations write appropriate actions.
   - Announcer `unpublishResult`, `swapResultNumbers`, `publishStandings`, `announceStandings` write actions.
   - Add `FREEZE_FESTIVAL` and `DELETE_FESTIVAL_ADMIN` to the `AuditAction` union. Route `freezeFestivalAdmin` and `deleteFestivalAdmin` through `createAuditLog`.
2. **Lifecycle (F1–F5):**
   - Wire `getFestivalsToExpire` into the existing cron at `src/app/api/v1/cron/route.ts`. Sets `status="EXPIRED"` and triggers `expireFestival` cleanup.
   - `assertAnnouncerAccess` + `ensureFestivalWritable` collapse to one helper.
   - `isDateOnlyUpdate` defined in one place (`festival-lifecycle-policy.service.ts`).
   - `festivalLifecycleEvent.ACTIVATED` either gets a writer or is removed.
3. **Race fixes (H1–H5):**
   - Wrap `MemberService.addMember` in a transaction.
   - Cascade `MemberService.removeMember` to delete related `stageAssignment` rows.
   - `setPlanFeatureTagOverrideAction` — wrap per-feature writes in a transaction.
   - `updateFestivalAdmin` — write festival row + audit row in one transaction.

## Acceptance

- Every festival mutation writes to the audit log with an action in the union.
- `festival.status="EXPIRED"` is set automatically by the cron.
- `grep -r "as any" src/features/festivals/ src/features/announcement/` returns only the typed `institutionType` cast (replaced in §2) and standard JSON-cast patterns.

---

# §6 — Out of Scope (Follow-up Tickets)

- **Backfill** — find festivals with `tier="STANDARD"` whose owner has a `payment.tier="PRO"` and `payment.used=false`; correct tier + mark payment used. New ticket.
- **"Plan" vs "Tier" naming** — UI copy in pricing showcase, admin module, dashboard docs. Cosmetic. New ticket.
- **Public-site reads** — feature-gate `media`/`news` reads on the public site; some endpoints gate, some don't. New ticket.
- **Untested festival services** — 11 of 14 services have zero coverage. New ticket per service cluster.

---

## Background — why

The PRO→STANDARD bug surfaced because `POST /api/v1/festivals` (the live HTTP route) doesn't validate the payment or set `tier` from it. The correct logic exists in the unused server action `createFestival` at `src/features/festivals/actions/festival-crud.actions.ts:32`. A repository sweep found:

- 6 other columns with the same "silent DB default" bug class (A1–A7).
- 6+ contract/schema mismatches that compound the same risk (B1–B6).
- 1 live HTTP route that does the same wrong thing as the one we just fixed (C1).
- 14 items of dead code (D1–D14).
- 9 audit-log gaps including one on the live delete path (E1–E9).
- 5 lifecycle-policy gaps (F1–F5).
- 4 inconsistent tier-resolution patterns (G1–G4).
- 5 race-condition / non-atomic-write risks (H1–H5).
- Zero tests on the four festival action files (I).
- Widespread "plan" vs "tier" naming drift in UI copy (J).

The highest-value cluster is the silent-defaults bug class (§1): six more columns will produce the same shape of bug as PRO→STANDARD at the next code change. Tightening the DB schema + adding the regression test is the cheapest insurance.

---

## Open questions to confirm

1. **PR ordering**: §1 → §2 → §3 → §4 → §5, OR §1 → §4 → §3 → §2 → §5 (dead-code-first so the next change reads cleaner)?
2. **Backfill ticket**: do you want it drafted in the same pass, or filed separately after §1 lands?
3. **Naming cleanup**: is "Plan" in the pricing-page and admin module names acceptable to leave, or do you want it in the same issue?
