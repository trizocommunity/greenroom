# Festival Lifecycle + Exports (Foundation, Data, Templates)

## Status
- **Created**: 2026-08-01
- **Status**: Partial (2026-08-05 audit) — §1 Festival Lifecycle shipped (commit `147d4b3`); §2 Exports foundation mostly done (ExportsClient + 5/7 generators); §3 Templates partial
- **Priority**: High
- **Complexity**: High
- **Blocks**: any future retention / pruning work; any STANDARD/PRO read-only-window feature; further export types beyond Badge + Certificate
- **Internal dependency**: §3 (Exports — Templates) requires §2 (Exports — Foundation) to be merged first

This issue consolidates three planned pieces of work:

1. **§1 — Festival Lifecycle**: expiry transaction rewrite, Manual Book from live tables, T-7 notifications, festival relaunch, dead-code + magic-number cleanup.
2. **§2 — Exports Foundation + Data Exports**: `festival_export` model, orchestrator, download route, 2-day retention, Exports dashboard page, 7 server-side data exports (PDF + CSV).
3. **§3 — Exports Templates**: client-rendered Badge + Certificate exports plugging into the §2 model.

§2 is independent of §1. §3 depends on §2.

---

# §1 — Festival Lifecycle (Expiry Cleanup, Relaunch, T-7 Notifications)

## Summary

Finalize the festival lifecycle so it matches the product decision: **all tiers live 90 days, no read-only window, hard-expiry on day 90**. Concretely:

1. **Expiry transaction keeps operational data** (`programme`, `participant`, `result`, `group`, `category`, `stage`, `scheduleEntry`, `programmeAssignment`, `festivalMember`, `festivalNews`, `festivalMediaImage`) so the owner can always download the **Manual Book** PDF, regenerated on demand from these live tables — no stored file, no snapshot blob.
2. **Expiry transaction strips festival descriptive data** (`description`, `orgName`, branding, dates, deadlines, settings, counters, etc.) and sets `status="EXPIRED"`, `expiredAt=now`, `archivedAt=now`.
3. **Expiry transaction cleans orphan tables** (12 `festivalId`-keyed tables: scoring policies, judges, code letters, poster templates, etc.) so the EXPIRED row is the only row left under the festival id.
4. **Drop** the `expired_festival_manual_book` / `expired_festival_result` snapshot tables — no more frozen JSON/PDF blobs.
5. **Relaunch** flow: owner visits expired detail page → picks tier → pays → new `festival-setup` → fresh dashboard. Expired row stays as history.
6. **T-7 email + in-app banner** via the daily cron, idempotent through a `festival_lifecycle_event` row.
7. **Delete** dead code at `src/features/festivals/services/festival-lifecycle.service.ts`.
8. **Route all magic numbers** through a single `getFestivalDurationDays()` helper.

### Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Duration policy | All tiers = 90 days (no tier split) |
| 2 | Post-expiry model | Delete festival descriptive data + clean orphans. Keep operational data on the festival row. PDF regenerated on demand. |
| 3 | Festival row on expiry | Row stays (`status="EXPIRED"`, `expiredAt`, `archivedAt`) — anchor for Manual Book + Relaunch |
| 4 | Manual Book generation | On-demand from live kept tables. **No snapshot tables.** |
| 5 | Orphan table cleanup | Yes — `expireFestival` transaction deletes every `festivalId`-keyed table not in the keep-list |
| 6 | Storage | No file storage. PDF is streamed from the route handler. |
| 7 | Retention on kept tables | None — rows live forever as historical record. Read-only access via expired detail page only. |
| 8 | Public festival page after expiry | Continues to render `ExpiredFestivalView` — generates PDF from kept tables on demand |
| 9 | Relaunch | New festival row, new payment, new `festival-setup`. Expired row stays as history. |
| 10 | Relaunch payment | Owner buys a new `FESTIVAL_CREATION` credit (same flow as first-time creation) |
| 11 | Relaunch cooldown | None — owner can relaunch unlimited times |
| 12 | T-7 notification channel | Email + in-app banner |
| 13 | T-7 notification idempotency | `festival_lifecycle_event` row with `event="EXPIRATION_WARNING"` checked before sending |
| 14 | Dead code | Delete `FestivalLifecycleService` file |
| 15 | Magic numbers | Routed through `getFestivalDurationDays()` helper |
| 16 | Schema changes | Single column added: `festival.archivedAt`. No other column changes. |
| 17 | Migration | Track A (`schema.ts`) + Track B (hand-authored `drizzle/00XX_*.sql`) |
| 18 | Locked festival (`isLocked=true`) | Untouched — admin freeze remains separate |

### Problem Statement

1. Current `FestivalExpirationService.expireFestival()` hard-deletes operational tables and snapshots them into two new tables (`expired_festival_manual_book`, `expired_festival_result`) — frozen blobs that don't match the live data shape and are hard to query or update.
2. ~12 `festivalId`-keyed tables aren't cleaned → orphan rows linger forever.
3. No in-context entry point to start a new festival after one expires.
4. No advance warning — owners discover expiry at the dashboard redirect.
5. Stale dead code: `FestivalLifecycleService` is orphaned and imports a "40-day" comment contradicting the 90-day config.
6. Magic-number UI: 4 files have hardcoded `30`/`40`/`180` day constants that drift from the actual 90-day policy.

### Out of Scope

- STANDARD/PRO read-only window after expiry (ruled out per PRD §8.2).
- Tier-aware duration (BASIC ≠ STANDARD ≠ PRO). All 90 days.
- True background-job runner for Manual Book generation (regen is sub-second).
- Snapshotting Manual Book to external storage.
- Audit log of who downloaded the Manual Book (deferred).
- Cross-festival relaunch (one festival per `ownerId` invariant remains).
- Changing `participant.isTeamLeader` and team-leader portal.

### Solution

#### 1. Schema change — `festival.archivedAt`

Track A — add to `src/core/database/schema.ts` (festival table, around line 359, after `expiredAt`):
```ts
archivedAt: timestamp({ precision: 3, mode: "string" }),
```
Indexed via `festival_archivedAt_idx` (btree asc, nulls last) for the admin archive view.

Track B — author `drizzle/00XX_festival_archived_at.sql`:
```sql
ALTER TABLE "festival" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "festival_archivedAt_idx" ON "festival" USING btree ("archivedAt" ASC NULLS LAST);
```

`festival_lifecycle_event` enum gains `EXPIRATION_WARNING`. Snapshot tables are **dropped** (Track B migration).

#### 2. Centralized duration helper

`src/config/pricing.ts`:
```ts
export const getFestivalDurationDays = (): number =>
  TIER_CONFIG.BASIC.festivalDurationDays; // 90 today; future-proofs tier-aware policy
```

#### 3. Rewrite `FestivalExpirationService.expireFestival`

Single transaction that:
1. Sets 31+ descriptive columns to `null`/`false`/`0`, plus `status="EXPIRED"`, `expiredAt`, `archivedAt`.
2. Deletes 12 orphan tables explicitly (FK cascades cover children): `festivalScoringPolicy`, `festivalScoringAwardRule`, `judge`, `judgementConfig` (+ cascaded `judgementConfigJudge`), `programmeReportingSession` (+ cascaded `programmeReportedParticipant`), `programmeCodeLetter` (+ cascaded `programmeCodeLetterRecipient`, `programmeTeamLead`, `judgementScore`), `stagePortalCredential`, `stagePortalSession`, `pendingInvitation`, `programmeNotification`, `festivalPosterTemplate`, `stageManagerAssignment`, `judgeStageAssignment`.
3. **KEEPS** 11 operational tables: `programme`, `participant`, `result`, `group`, `category`, `stage`, `scheduleEntry`, `programmeAssignment`, `festivalMember`, `festivalNews`, `festivalMediaImage`.
4. Inserts a `festival_lifecycle_event` row with full metadata + an `audit_log` row with `action="EXPIRE_FESTIVAL"`.
5. Is idempotent: early-return if `status === "EXPIRED"`.

#### 4. Rewrite `ManualBookService`

Reads from live kept tables, no snapshot:
```ts
export async function generateManualBookPdf(festivalId: string, name: string): Promise<Buffer> {
  const { festival, programmes, participants, results, groups, categories, stages, schedule } =
    await loadKeepTablesForFestival(festivalId);
  return renderManualBookPdf({ festival: minimalAnchor(festival), programmes, participants, results, groups, categories, stages, schedule });
}
```
Routes updated: `src/app/api/festivals/[slug]/expired-results-pdf/route.ts` and `src/app/api/profile/festivals/[festivalId]/manual-book/route.ts` switch to the live query path; guards allow `status === "EXPIRED" || status === "PAST"`.

#### 5. Drop snapshot tables

Same Track B migration drops `expired_festival_manual_book` + `expired_festival_result`. Remove their definitions from `schema.ts` and `relations.ts`.

#### 6. Delete dead code

Delete `src/features/festivals/services/festival-lifecycle.service.ts`. `grep -r "FestivalLifecycleService" src/` must return zero hits.

#### 7. Pre-archival cycle → T-7 email + in-app banner

`runPreArchivalCycle()` extended with `runNotificationsCycle()`:
- Pulls festivals with `expiresAt` within next 7 days (already-supported `getFestivalsApproachingExpiry(7)`).
- For each, checks `festival_lifecycle_event` for `event="EXPIRATION_WARNING"`; if missing, sends email + sets banner + inserts lifecycle event row.
- Idempotent across cron ticks.

New files:
- `src/features/notifications/services/expiry-notification.service.ts` — `sendExpiryWarningEmail(festival, daysRemaining)`.
- `src/features/notifications/services/in-app-banner.service.ts` — `setInAppBanner(userId, festivalId, daysRemaining)`.

#### 8. In-app banner UI

- New `src/components/festival/dashboard/ExpiryWarningBanner.tsx` — dismissible banner rendered above dashboard header.
- `src/app/dashboard/[slug]/layout.tsx` mounts it when `daysRemaining <= 7 && daysRemaining >= 0 && status !== "EXPIRED"`.

#### 9. Relaunch flow

**Backend** — `src/features/festivals/actions/festival-crud.actions.ts` adds `relaunchFestival({ paymentId, festivalName })`:
- Same payment validation as `createFestival`.
- Insert new festival row: new `id`, same `ownerId`, `expiresAt = now + duration`, `status="READY"`, `isLocked=false`.
- Mark payment used, insert `festivalMember` for owner, audit `REPLACE_FESTIVAL_LIFECYCLE`.
- Partial unique index `festival_ownerId_key` becomes `WHERE status != 'EXPIRED'` (Track B migration). Owners can have many EXPIRED history rows + zero or one active festival.

**Frontend**:
- `src/app/(overview)/profile/festivals/[slug]/expired/page.tsx` — add **Relaunch** button alongside **Download PDF**.
- New `src/app/festivals/new/page.tsx` — tier grid + "Pay & Continue" that creates a `FESTIVAL_CREATION` payment intent.
- `src/app/festival-setup/page.tsx` — accept optional `?from=<expiredSlug>` for contextual breadcrumb.
- `src/components/profile/tabs/FestivalsTab.tsx` — expired card shows **Download PDF** + **Relaunch**.
- `src/components/profile/tabs/OverviewTab.tsx:272-278` — append Relaunch CTA to existing expiry banner.

#### 10. UI magic-number cleanup

| File | Current | Replacement |
|---|---|---|
| `src/components/profile/FestivalCard.tsx:30` | `const totalDays = 30;` | `getFestivalDurationDays();` |
| `src/components/festival/setup/FestivalDetailsDialog.tsx:85` | `+ 30 * MS_PER_DAY` | `+ getFestivalDurationDays() * MS_PER_DAY` |
| `src/components/festival/setup/FestivalDetailsDialog.tsx:87` | `+ 180 * MS_PER_DAY` | `+ getFestivalDurationDays() * 2 * MS_PER_DAY` |
| `src/features/festivals/loaders/festival-public.loader.ts:78` | `+ 40 * MS_PER_DAY` | `+ getFestivalDurationDays() * MS_PER_DAY` |
| `src/components/profile/tabs/OverviewTab.tsx:201` | `+ 30 * MS_PER_DAY` | `+ getFestivalDurationDays() * MS_PER_DAY` |

`MS_PER_DAY = 86_400_000` (already in `pricing.ts`).

### Phased Implementation Order (§1)

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1.1 | Duration helper + magic-number cleanup | `getFestivalDurationDays()` exported; 5 files updated | `grep '\* 24 \* 60 \* 60 \* 1000' src/` → only centralized helper |
| 1.2 | Schema additions + migration | `festival.archivedAt` (Track A + B); enum gains `EXPIRATION_WARNING`; partial unique-index | `pnpm db:reset`; `\d festival`; `\d festival_lifecycle_event` |
| 1.3 | Snapshot table drop | DROP `expired_festival_manual_book` + `expired_festival_result`; remove from schema + relations | Schema clean; `db:reset` succeeds |
| 1.4 | Rewrite `expireFestival` | Strip descriptive fields + clean 12 orphans in one tx; keep 11 operational tables | Dry-run on seeded festival; row state matches spec |
| 1.5 | Rewrite `ManualBookService` | Reads live kept tables | Expire a festival, download PDF, verify content matches live data |
| 1.6 | Notification cycle | `runNotificationsCycle` + email + in-app banner; idempotent | Set `expiresAt` to T-3, run cron manually; second run is a no-op |
| 1.7 | In-app banner UI | `ExpiryWarningBanner.tsx` + layout integration | Banner appears at T-7; dismissible |
| 1.8 | Delete dead code | Remove `festival-lifecycle.service.ts` | `grep` returns nothing |
| 1.9 | Cleanup migration for existing EXPIRED festivals | `scripts/cron/expired-festival-cleanup.ts` — dry-run by default, `--apply` to commit | `--apply` on staging copy; PDF still generates |
| 1.10 | Relaunch backend | `relaunchFestival` action + partial unique index | Expire → relaunch with new payment → new id, EXPIRED row still listed |
| 1.11 | Relaunch frontend | `/festivals/new` page + Relaunch button + breadcrumb | Full end-to-end relaunch |

### Files Touched (§1)

**New**
- `drizzle/00XX_festival_archived_at_and_unique_partial_index.sql`
- `src/features/notifications/services/expiry-notification.service.ts`
- `src/features/notifications/services/in-app-banner.service.ts`
- `src/components/festival/dashboard/ExpiryWarningBanner.tsx`
- `src/app/festivals/new/page.tsx`
- `scripts/cron/expired-festival-cleanup.ts`

**Modified**
- `src/core/database/schema.ts` — add `festival.archivedAt`; extend `festivalLifecycleEventType`; drop snapshot tables
- `src/core/database/relations.ts` — drop two expired relations
- `src/config/pricing.ts` — export `getFestivalDurationDays()`
- `src/features/festivals/services/festival-expiration.service.ts` — rewrite `expireFestival()`, extend `runPreArchivalCycle()`, add `getFestivalsApproachingExpiry(7)`
- `src/features/festivals/services/manual-book.service.ts` — live kept tables
- `src/features/festivals/actions/festival-crud.actions.ts` — add `relaunchFestival`
- `src/app/api/v1/cron/route.ts` — call `runNotificationsCycle()` first
- `src/app/api/festivals/[slug]/expired-results-pdf/route.ts` — live kept tables
- `src/app/api/profile/festivals/[festivalId]/manual-book/route.ts` — live kept tables; allow EXPIRED/PAST access
- `src/app/dashboard/[slug]/layout.tsx` — mount `ExpiryWarningBanner` at T-7
- `src/app/(overview)/profile/festivals/[slug]/expired/page.tsx` — Relaunch button
- `src/app/festival-setup/page.tsx` — accept `?from=<expiredSlug>`
- `src/components/profile/tabs/FestivalsTab.tsx` — Download + Relaunch
- `src/components/profile/tabs/OverviewTab.tsx` — magic-number + Relaunch CTA
- `src/components/profile/FestivalCard.tsx` — magic-number
- `src/components/festival/setup/FestivalDetailsDialog.tsx` — magic-number
- `src/features/festivals/loaders/festival-public.loader.ts` — magic-number

**Deleted**
- `src/features/festivals/services/festival-lifecycle.service.ts`

### Risks & Mitigations (§1)

| Risk | Mitigation |
|---|---|
| Existing EXPIRED festivals break under new model | Phase 1.9 cleanup script with dry-run default |
| Partial unique index migration fails on prod | Track B migration is idempotent; uses `CREATE UNIQUE INDEX IF NOT EXISTS` |
| Stripped descriptive fields render as `null` in old UI | UI fields (`FestivalStatusCard`, `ExpiredFestivalView`) already tolerate missing data |
| `runNotificationsCycle` re-emails on every cron tick | Idempotency via `EXPIRATION_WARNING` lifecycle event row |
| Relaunch collision if owner has still-active festival | Partial unique index blocks insert; UI: "Let current festival expire before relaunching" |
| Manual Book regen slow with many rows | Indexed `festivalId` FKs on every table |
| Email provider missing in dev | Log to console + still insert lifecycle event |
| Dropping `expired_festival_manual_book` orphans anything | Verified no other FK references these tables |

### Acceptance Criteria (§1)

- [ ] All 11 phases shipped as their own branch + commit.
- [ ] `db:reset` runs cleanly with the new schema.
- [ ] `grep "FestivalLifecycleService" src/` returns nothing.
- [ ] `grep '\* 24 \* 60 \* 60 \* 1000' src/` returns only the centralized helper.
- [ ] Manual Book PDF downloads for an EXPIRED festival and content matches live tables.
- [ ] T-7 email + banner appear at T-7; second cron run is a no-op.
- [ ] Relaunch flow works end-to-end with a new payment; expired row stays in profile.
- [ ] Old EXPIRED festivals cleaned up via the migration script without losing operational data.

---

# §2 — Exports Foundation + Server-Side Data Exports

## Summary

Introduce a festival-scoped **Exports** feature: a dashboard page where admins queue exports, watch them process, auto-download when ready, and re-download until they expire. This section delivers **the whole shell** (page, table, "Create Export" drawer, job model, storage, download, retention, plan gating) **plus every server-side data export** — the ones generated from database rows with `jspdf` (PDF) and `xlsx` (CSV). Template exports (Badge, Certificate) are split into §3.

### Data export types shipped here

| Type (UI label) | Description | Source data |
|---|---|---|
| **Call List** | Stage call lists for event coordinators | `programme` + `programmeAssignment` + `participant` + `scheduleEntry` |
| **Results** | Result sheets with standings & marks | `result` + `programmeAssignment` + `participant`/`group` |
| **Team Result** | Team-wise aggregated results | `result` aggregated by `group` |
| **Judge List** | Assignments & details for judges | `judge` + `judgeStageAssignment` + `judgementConfig` |
| **Valuation Sheet** | Blank scoring sheets for judges/evaluators | `programme` + `programmeAssignment` (code letters, no marks) |
| **Green Room Sign** | Backstage / green-room call signage | `scheduleEntry` + `programme` + `participant` |
| **Schedule Conflicts** | Schedule conflict report with severity | reuse `checkScheduleConflict` / `ConflictParts` |

> **Terminology.** UI uses **Competition** (= `programme`) and **Team** (= `group`), matching the attached mockups. Code and schema keep `programme`/`group`.

### Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | File storage | **Neon Postgres `bytea` column** on `festival_export`. No Cloudinary, no Vercel Blob. |
| 2 | File delivery | **Stream-to-download**: route handler streams stored bytes with `Content-Disposition: attachment`. |
| 3 | PDF generation | `jspdf` (already installed), server-side. |
| 4 | CSV generation | `xlsx` (already installed), server-side. |
| 5 | "Background processing" | Inline in create request (~1–5 s). Status model built so a real async worker can slot in later. |
| 6 | Retention | 2 days; deleted by daily cron. |
| 7 | Read-only festivals | Allowed on PAST/EXPIRED (pure reads). |
| 8 | Access | `ADMIN` / `OWNER` only, via `assertFestivalAccess` + role check. |
| 9 | No Puppeteer | Ruled out (serverless weight). Confirmed. |

### Problem Statement

Festival organisers have no single place to pull paper artefacts — call lists, result sheets, valuation sheets, green-room signage, judge assignments — and the one-off exports that exist (e.g. participant QR PDFs in `src/features/participants/services/qr-pdf-utils.ts`) are scattered and client-only. No history, no re-download, no consistent filter UX.

### Out of Scope

- Badge & Certificate template exports (Konva, client-rendered) → §3.
- True background-job queue / worker — generation is inline.
- External object storage.
- Editing/re-running a past export's config (each "Create Export" is a fresh job).

### Solution

#### 1. Schema — new table `festival_export`

Add to `src/core/database/schema.ts` (Track A, `db:push`) **and** author a matching `drizzle/00XX_festival_export.sql` (Track B, production history).

```ts
exportType   = ["CALL_LIST","RESULTS","TEAM_RESULT","JUDGE_LIST",
                "VALUATION_SHEET","GREEN_ROOM_SIGN","SCHEDULE_CONFLICTS",
                "BADGE","CERTIFICATE"]   // BADGE/CERTIFICATE reserved for §3
exportFormat = ["PDF","CSV"]
exportStatus = ["PROCESSING","COMPLETED","FAILED"]
```

`festival_export` columns: `id`, `festivalId` (fk, cascade, indexed), `type`, `format`, `status` (default `PROCESSING`), `summary`, `config` (jsonb, Zod-validated), `fileName`, `fileBytes bytea?`, `fileSizeBytes`, `itemCount`, `errorMessage`, `createdBy`, `queuedAt`, `completedAt?`, `completedInMs?`, `expiresAt = queuedAt + 2 days`.

Indexes: `(festivalId, queuedAt desc)`, `expiresAt`.

#### 2. Feature module — `src/features/exports/`

```
schemas/export-config.schema.ts   -- discriminated union on `type`, one Zod variant per export type
types/export.types.ts
repositories/export.repository.ts  -- create / listByFestival / getById / delete / deleteExpired
services/
  export-orchestrator.service.ts   -- createExport(): validate config → build summary → dispatch → write bytes → finalize
  summary.service.ts               -- config → human summary + filter badges (["Gender: All genders", "+4"])
  generators/
    call-list.generator.ts
    results.generator.ts
    team-result.generator.ts
    judge-list.generator.ts
    valuation-sheet.generator.ts
    green-room-sign.generator.ts
    schedule-conflicts.generator.ts
  render/
    pdf-doc.ts                     -- shared jspdf helpers (cover page, page-layout: single-per-page vs continuous grid)
    csv-sheet.ts                   -- shared xlsx→csv helpers
actions/export.actions.ts          -- createExportAction, listExportsAction, deleteExportAction → ActionResponse<T>
```

Each generator is a pure `(db, festivalId, config) → { bytes, fileName, itemCount, summary }`. The orchestrator owns status/timing/errors so all types behave identically.

#### 3. API — download + list

- **Route handler** `src/app/api/v1/exports/[id]/download/route.ts` using `createProtectedHandler` (`src/api/lib`): assert festival access, load row, if `COMPLETED && !expired` stream `fileBytes` with `Content-Type` from `format` and `Content-Disposition: attachment; filename="<fileName>"`. `404` on expired/missing.
- React-query client `src/api/client/exports.ts`: `useExports(festivalId)` (with `refetchInterval` while any row is `PROCESSING`), `useCreateExport`, `useDeleteExport`, query keys in `_query-keys.ts`.

#### 4. Retention cron

Extend the existing daily cron target (`vercel.json` → `/api/v1/cron`) to call `export.repository.deleteExpired()` (rows where `expiresAt < now()`), nulling bytes.

#### 5. Sidebar + plan gating

- **Exports** entry (icon `FileDown`) in `src/config/sidebar.config.ts`, `allowedRoles: ["ADMIN","OWNER"]`, in the **Event Works** group.
- New feature flag `exports` in `src/config/pricing.ts` + `src/features/plan-features/services/features-tags.ts`; filter in `FestivalDashboardSidebar.tsx`.

#### 6. UI

Route `src/app/dashboard/[slug]/exports/`:
- `page.tsx` (server): resolve festival, guard `ADMIN`/`OWNER`, render client.
- `ExportsClient.tsx`: header ("Exports" + subtitle *"Files are processed in the background, auto-downloaded when ready, and expire after 2 days."* + **New Export** button) and the table.
- `_components/ExportsTable.tsx`: columns **Export Type** (icon + label), **Summary** (text + filter badges, `+N` overflow), **Status** badge, **Completed In**, **Queued At** (relative, `date-fns`), **Actions** (download enabled when `COMPLETED`; delete with `DeleteDialog`). Auto-trigger download once when a polled row flips to `COMPLETED`.
- `_components/NewExportDrawer.tsx` (using `sheet.tsx`): **Export Type** card grid (single-select with check) → **Configure Filters** (per-type panel) → sticky footer with **Format** (PDF / CSV segmented) + primary **Export PDF/CSV** button.
- `_components/filters/*` — one component per type.

#### 7. Per-type filter specs

- **Call List** — ☑ only competitions with participants · Call List Type (Competition-wise / Team-wise) · Gender · include columns (chest no, DOB, phone, category, team) · Category & Competition multi-select · Schedule state (All/Scheduled/Unscheduled) · Scheduled stages multi-select · Page layout (Single per page / Continuous grid).
- **Results / Team Result** — Result Type (Competition-wise / Team-wise) · Gender · include (code letter, grades, points, judge reports, phone, DOB) · Start/End result no · **Only published results** · Category/Competition multi-select · page layout.
- **Judge List** — Grouping (Judge-wise / Competition-wise) · Layout (Single per page / Continuous grid) · Categories / Competitions / Stages multi-select · include judge contact details.
- **Valuation Sheet** — Competitions multi-select · Gender · include code letters · one sheet per competition · page layout.
- **Green Room Sign** — Stages/Schedule multi-select · per-competition sign with call time + participant list · page layout (Single per page recommended).
- **Schedule Conflicts** — severity threshold · scope (all stages / selected) · reuse `getTimeConflictError`/`conflictPartsToMessage` from `src/features/schedule/actions/schedule.actions.ts`.

### Phased Implementation Order (§2)

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 2.1 | Schema + migration | `festival_export` (Track A + Track B SQL); repo CRUD + `deleteExpired` | `\d festival_export`; `db:push` clean |
| 2.2 | Orchestrator + first CSV | `export-orchestrator` + `team-result.generator` (simplest) | Row `COMPLETED` with bytes; itemCount correct |
| 2.3 | Download + retention | download route streams bytes; cron deletes expired | curl downloads CSV; expired → 404 |
| 2.4 | Page + table shell | route, `ExportsClient`, `ExportsTable`, sidebar entry, gating, polling + auto-download | Empty state; one CSV end-to-end in browser |
| 2.5 | Create drawer | type grid + format footer + Team Result filter panel | Create from UI works |
| 2.6 | Call List + Results (PDF+CSV) | shared `pdf-doc` page-layout renderer | Both formats; layouts differ |
| 2.7 | Judge List + Valuation Sheet | generators + filter panels | Manual |
| 2.8 | Green Room Sign + Schedule Conflicts | generators (reuse conflict util) | Manual |
| 2.9 | Polish | filter badges/`+N`, failure state, read-only allowance, relative times | Matches mockups |

### Acceptance Criteria (§2)

- [ ] `festival_export` table + enums exist in `schema.ts` and a matching `drizzle/00XX_*.sql`.
- [ ] **Exports** appears in the sidebar for ADMIN/OWNER only, gated by the `exports` feature flag.
- [ ] Exports page renders header, subtitle, **New Export** button, and a polling table with columns Export Type / Summary (+ filter badges) / Status / Completed In / Queued At / Actions.
- [ ] "Create Export" drawer shows the export-type card grid, a per-type filter panel, and a sticky footer with PDF/CSV format toggle + Export button.
- [ ] All seven data export types generate a correct file (PDF and/or CSV) from festival-scoped data with documented filters applied.
- [ ] File bytes are stored in Neon `bytea`; **no Cloudinary / external storage**.
- [ ] Download streams bytes with `Content-Disposition: attachment`; auto-downloads once on completion; re-downloadable until expiry.
- [ ] Rows and bytes deleted 2 days after `queuedAt` by daily cron.
- [ ] Exports work on PAST/EXPIRED (read-only) festivals.
- [ ] `PROCESSING → COMPLETED/FAILED` lifecycle honoured; failures show Failed + `errorMessage`.

---

# §3 — Exports Templates (Badge + Certificate)

> **Depends on §2. Run only after the `festival_export` model, Exports page, table, drawer, download route, and retention are merged.**

## Summary

Add the two **template-driven visual exports** to the Exports feature: **Badge** (participant ID cards with chest number, team, category) and **Certificate** (participation & placement certificates). Unlike the data exports, these render from a festival's published **poster templates** (Konva documents), which only render on the client. So this section adds a **client-side render → PDF → finalize-upload** path that plugs into the same `festival_export` job model, table, and download flow from §2.

### Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Rendering | **Client-side Konva**, reusing poster-editor render path (`src/components/editor/*`, `src/features/posters/services/poster-editor-preview.service.ts`). No `node-canvas`, no Puppeteer. |
| 2 | Assembly | Rendered item images composited into a single PDF with `jspdf` (client-side), like `qr-pdf-utils.ts`. |
| 3 | Persistence | Client POSTs finished PDF bytes to a **finalize** endpoint that writes into `festival_export.fileBytes` (Neon `bytea`). |
| 4 | Job creation | `createExportAction` accepts BADGE/CERTIFICATE, creates row as `PROCESSING`, returns the resolved **bindings** for the client to render. |
| 5 | Quality | Screen / Standard / Print → DPI; physical size from template pixel size — **fitting never upscales**. |
| 6 | Templates | Badge → published `CANDIDATE_CARD` templates; Certificate → published templates for certificates. Uses `PosterTemplateRepo`. |

### Problem Statement

§2 covers only DB-row exports (`jspdf`/`xlsx`, server-side). Badges and certificates are **pixel artefacts** defined by per-festival Konva templates that render only in the browser. They need a different pipeline, but must appear as the same kind of job in the same Exports table (queued → processing → completed → download, 2-day expiry).

### Out of Scope

- Editing poster templates (existing poster editor owns that).
- Server-side rasterisation of Konva.
- New export types beyond Badge and Certificate.

### Solution

#### 1. Extend orchestrator for template types

`export-orchestrator.service.ts` (from §2) gains a template branch: for BADGE/CERTIFICATE, validates config, resolves bindings server-side, creates the `festival_export` row as `PROCESSING`, returns `{ exportId, templates, bindings }` **instead of** generating bytes. Reuses `buildResultPosterBindings` and candidate/team equivalents in `poster-editor-preview.service.ts`.

#### 2. Finalize endpoint

`src/app/api/v1/exports/[id]/finalize/route.ts` (`createProtectedHandler`): accepts client-rendered PDF, asserts festival access + ownership + `status === "PROCESSING"`, writes `fileBytes`, `fileSizeBytes`, `itemCount`, sets `status = "COMPLETED"`, `completedAt`, `completedInMs`. Client error → companion call marks `FAILED` with `errorMessage`. Enforce a max byte size.

#### 3. Client renderer

`src/app/dashboard/[slug]/exports/_components/ClientTemplateRenderer.tsx`: mounted offscreen when a BADGE/CERTIFICATE job is created. Renders each item's Konva doc with its bindings, rasterises at the selected DPI (`stage.toDataURL({ pixelRatio })`), lays images into a `jspdf` doc per **Print Layout**, then POSTs to finalize. Drives the same `PROCESSING` row.

#### 4. Filter panels

`_components/filters/BadgeFilters.tsx` and `CertificateFilters.tsx`, added to the `NewExportDrawer` type grid:

**Badge** — Category multi-select · Team multi-select · Gender (All/Male/Female) · **Template** (published CANDIDATE_CARD) · **Export Quality** (Screen/Standard/Print) · **Print Layout** (One per page / Multiple per page) · ☑ only participants with chest numbers. Format locked to **PDF**.

**Certificate** — Categories multi-select · Competitions multi-select ("empty = all") · **Certificate Types** (Participation, 1st, 2nd, 3rd, Common Prize, Grade) · **Template** · **Export Quality** · **Print Layout**. Format locked to **PDF**.

#### 5. Type-card entries

Add **Badge** (award/seal icon) and **Certificate** (certificate icon) cards to the export-type grid. CSV toggle disabled for both.

### Phased Implementation Order (§3)

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 3.1 | Orchestrator template branch + bindings | BADGE/CERTIFICATE create → `PROCESSING` row + returned bindings | Row created; bindings shape correct |
| 3.2 | Finalize endpoint | writes bytes, flips to `COMPLETED`; `FAILED` path | curl finalize → downloadable PDF |
| 3.3 | Client renderer | offscreen Konva render → jspdf → finalize | Badge PDF matches template |
| 3.4 | Badge filter panel + quality/layout | DPI mapping, no-upscale fit, One/Multiple per page | Print vs Screen differs; multi-up grid |
| 3.5 | Certificate filter panel + types | placement/participation resolution from `result` | Correct certs per type |
| 3.6 | Polish | large-file guard, failure surfacing, empty-template state | Manual |

### Acceptance Criteria (§3)

- [ ] **Badge** and **Certificate** appear as cards in the Create Export type grid, PDF-only.
- [ ] Selecting a type shows its filter panel (template picker, quality, print layout, documented filters).
- [ ] Creating the export inserts a `PROCESSING` row in the same Exports table, using the same `festival_export` model.
- [ ] Items render **client-side via Konva** from the chosen published template with correct bindings.
- [ ] Export Quality maps to DPI; physical size from template pixels; **artwork never upscaled**.
- [ ] Print Layout produces one-per-page or multiple-per-page PDFs correctly.
- [ ] Finished PDF bytes stored in `festival_export.fileBytes` (Neon), row flips to `COMPLETED`, downloads/auto-downloads and expires exactly like data exports.
- [ ] Client render/finalize failures mark row `FAILED` with a message; no orphaned `PROCESSING` rows.
- [ ] No Cloudinary, no server-side Konva, no Puppeteer.

---

## Overall Implementation Order (cross-§)

§2 is independent of §1. §3 depends on §2. A reasonable sequence:

1. Land all of §1 (phases 1.1 → 1.11).
2. Land all of §2 (phases 2.1 → 2.9).
3. Land all of §3 (phases 3.1 → 3.6).

§2 and §1 can be done in parallel by separate branches since they touch disjoint files (lifecycle touches `src/features/festivals/**`, exports touches `src/features/exports/**` + new table). Merge conflicts only arise if Phase 2.4 (sidebar entry) edits the same `src/config/sidebar.config.ts` that §1 might also touch — review there.

## References

- Existing cron: `vercel.json` → `/api/v1/cron`, `src/app/api/v1/cron/route.ts`
- Existing email warning pipeline (already shipped): `ISSUE-14-unified-branded-email-layer.md` (`festival_expiring_soon` kind, `festivalExpiringSoonEmailSentAt` column on `festival`)
- Datetime module: `src/core/datetime/index.ts`, `src/core/datetime/server.ts`
- Neon infra: `issues/neon-database-adoption.md`
- DB client (Neon): `src/core/database/client.ts`; Drizzle config: `drizzle.config.ts`
- Existing export pattern (client-only PDF batch): `src/features/participants/services/qr-pdf-utils.ts`
- Schedule conflict logic: `src/features/schedule/actions/schedule.actions.ts`
- Table+drawer pattern: `src/app/dashboard/[slug]/content/news/NewsClient.tsx`
- Sidebar config: `src/config/sidebar.config.ts`, `src/components/festival/dashboard/FestivalDashboardSidebar.tsx`
- Access + session: `assertFestivalAccess`, `getSession` (see `src/features/posters/actions/poster-export.actions.ts`)
- UI primitives: `src/components/ui/{sheet,drawer,table,badge}.tsx`, `src/components/ui/delete-dialog`
- Route-handler helpers: `src/api/lib/create-handler.ts`, `src/api/lib/response.ts`
- PRD §8.2 / §8.3 (`docs/PRDs/GREENROOM_PRD.md:655-661`) — design rationale for no read-only window
- Existing seed for QA: `scripts/seed.ts`, `scripts/seed/programmes.ts`
