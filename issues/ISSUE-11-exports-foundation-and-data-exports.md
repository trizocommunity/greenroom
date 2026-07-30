# Exports — Foundation + Server-Side Data Exports

## Status
- **Created**: 2026-07-30
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Vertical slice type**: AFK (no architectural HITL once storage model below is accepted)
- **Blocked by**: None — can start immediately
- **Blocks**: `ISSUE-12-exports-template-badge-certificate.md`

---

## Summary

Introduce a festival-scoped **Exports** feature: a dashboard page where admins queue exports of festival data, watch them process, auto-download them when ready, and re-download until they expire. This issue delivers the **whole shell** (page, table, "Create Export" drawer, job model, storage, download, retention, plan gating) **plus every server-side data export** — the ones generated from database rows with `jspdf` (PDF) and `xlsx` (CSV). Template/visual exports (Badge, Certificate) are split into `ISSUE-12`.

Data export types shipped here:

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

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | File storage | **Neon Postgres `bytea` column** on `festival_export`. No Cloudinary, no Vercel Blob, no external object store. |
| 2 | File delivery | **Stream-to-download**: a route handler streams the stored bytes with `Content-Disposition: attachment`. |
| 3 | PDF generation | `jspdf` (already installed), server-side inside the create request. |
| 4 | CSV generation | `xlsx` (already installed), server-side. `Content-Type: text/csv`. |
| 5 | "Background processing" | Generation runs **inline** in the create request (data exports complete in ~1–5 s). The status model (`PROCESSING → COMPLETED/FAILED`) is built so a real async worker can slot in later without UI changes. |
| 6 | Retention | Rows + bytes **expire after 2 days**; deleted by the existing daily cron (`/api/v1/cron`, `vercel.json`). |
| 7 | Read-only festivals | Exports **allowed** on PAST/EXPIRED festivals (pure reads). Do not gate on `useFestivalReadOnly`. |
| 8 | Access | `ADMIN` / `OWNER` only, via `assertFestivalAccess` + role check. |
| 9 | No Puppeteer | Ruled out (serverless weight). Confirmed. |

---

## Problem Statement

Festival organisers currently have no single place to pull the paper artefacts an event runs on — call lists, result sheets, valuation sheets, green-room signage, judge assignments — and the one-off exports that exist (e.g. participant QR PDFs in `src/features/participants/services/qr-pdf-utils.ts`) are scattered and client-only. There is no history, no re-download, and no consistent filter UX.

---

## Out of Scope

- **Badge & Certificate** template exports (Konva, client-rendered) → `ISSUE-12`.
- A true background job queue / worker — generation is inline this iteration.
- External object storage of any kind.
- Editing/re-running a past export's config (each "Create Export" is a fresh job).

---

## Solution

### 1. Schema — new table `festival_export`

Add to `src/core/database/schema.ts` (Track A, `db:push`) **and** author a matching `drizzle/00XX_festival_export.sql` (Track B, production history), consistent with the pattern in `ISSUE-10`.

New enums:
```ts
exportType   = ["CALL_LIST","RESULTS","TEAM_RESULT","JUDGE_LIST",
                "VALUATION_SHEET","GREEN_ROOM_SIGN","SCHEDULE_CONFLICTS",
                "BADGE","CERTIFICATE"]   // BADGE/CERTIFICATE reserved for ISSUE-12
exportFormat = ["PDF","CSV"]
exportStatus = ["PROCESSING","COMPLETED","FAILED"]
```

Table `festival_export`:
```
id            (pk)
festivalId    fk → festival, cascade, indexed
type          exportType
format        exportFormat
status        exportStatus (default PROCESSING)
summary       text          -- e.g. "Competition-wise call list for All teams"
config        jsonb         -- validated per-type filter payload (Zod)
fileName      text
fileBytes     bytea?        -- populated on COMPLETED
fileSizeBytes integer?
itemCount     integer?
errorMessage  text?
createdBy     fk → user
queuedAt      timestamp default now()   -- "Queued At" column
completedAt   timestamp?
completedInMs integer?                   -- "Completed In" column
expiresAt     timestamp                  -- queuedAt + 2 days
```

Indexes: `(festivalId, queuedAt desc)`, `expiresAt`.

### 2. Feature module — `src/features/exports/`

```
schemas/export-config.schema.ts   -- discriminated union on `type`, one Zod variant per export type
types/export.types.ts
repositories/export.repository.ts  -- create / listByFestival / getById / delete / deleteExpired
services/
  export-orchestrator.service.ts   -- createExport(): validate config → build summary → dispatch by type → write bytes → finalize
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

### 3. API — download + list

- **Route handler** `src/app/api/v1/exports/[id]/download/route.ts` using `createProtectedHandler` (`src/api/lib`): assert festival access, load row, if `COMPLETED && !expired` stream `fileBytes` with `Content-Type` from `format` and `Content-Disposition: attachment; filename="<fileName>"`. `404` on expired/missing.
- react-query client `src/api/client/exports.ts`: `useExports(festivalId)` (with `refetchInterval` while any row is `PROCESSING`), `useCreateExport`, `useDeleteExport`, plus query keys in `_query-keys.ts`.

### 4. Retention cron

Extend the existing daily cron target (`vercel.json` → `/api/v1/cron`) to call `export.repository.deleteExpired()` (rows where `expiresAt < now()`), nulling bytes.

### 5. Sidebar + plan gating

- Add **Exports** entry (icon `FileDown`) to `src/config/sidebar.config.ts`, `allowedRoles: ["ADMIN","OWNER"]`, in the **Event Works** group (or its own small group after it).
- Gate with a new feature flag `exports` in `src/config/pricing.ts` + `src/features/plan-features/services/features-tags.ts`; filter in `FestivalDashboardSidebar.tsx` like the existing entries.

### 6. UI

Route `src/app/dashboard/[slug]/exports/`:
- `page.tsx` (server): resolve festival, guard `ADMIN`/`OWNER`, render client.
- `ExportsClient.tsx`: header ("Exports" + subtitle *"Files are processed in the background, auto-downloaded when ready, and expire after 2 days."* + **New Export** button) and the table.
- `_components/ExportsTable.tsx`: columns **Export Type** (icon + label), **Summary** (text + filter badges, `+N` overflow using `badge.tsx`), **Status** (Completed/Processing/Failed badge), **Completed In**, **Queued At** (relative, `date-fns`), **Actions** (download enabled when `COMPLETED`; delete with `DeleteDialog`). Auto-trigger download once when a polled row flips to `COMPLETED`.
- `_components/NewExportDrawer.tsx` (using `sheet.tsx`): **Export Type** card grid (icon, title, description, single-select with check), then **Configure Filters** — a per-type panel — then a sticky footer with **Format** (PDF / CSV segmented, disabled where N/A) + primary **Export PDF/CSV** button. Matches attached mockups.
- `_components/filters/*` — one component per type (see filter spec below), fed by existing lookups (categories, programmes, groups, stages, judges).

### 7. Per-type filter specs

**Call List** — ☑ only competitions with participants · Call List Type (Competition-wise / Team-wise) · Gender (All/Male/Female) · include columns (chest no, DOB, phone, category, team) · Category & Competition multi-select ("empty = all") · Schedule state (All/Scheduled/Unscheduled) · Scheduled stages multi-select · Page layout (Single per page / Continuous grid).

**Results / Team Result** — Result Type (Competition-wise / Team-wise) · Gender · include (code letter, grades, points, judge reports, phone, DOB) · Start result no (default 1) / End result no (empty=all) · **Only published results** · Category/Competition multi-select · page layout.

**Judge List** — Grouping (Judge-wise / Competition-wise) · Layout (Single per page / Continuous grid) · Categories / Competitions / Stages multi-select · include judge contact details.

**Valuation Sheet** — Competitions multi-select · Gender · include code letters · one sheet per competition · page layout.

**Green Room Sign** — Stages/Schedule multi-select · per-competition sign with call time + participant list · page layout (Single per page recommended).

**Schedule Conflicts** — severity threshold · scope (all stages / selected) · reuse `getTimeConflictError`/`conflictPartsToMessage` from `src/features/schedule/actions/schedule.actions.ts`.

---

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1 | Schema + migration | `festival_export` (Track A + Track B SQL); repository CRUD + `deleteExpired`. | `\d festival_export`; `db:push` clean |
| 2 | Orchestrator + first CSV | `export-orchestrator` + `team-result.generator` (simplest). Create → row `COMPLETED` with bytes. | Row has bytes; itemCount correct |
| 3 | Download + retention | download route streams bytes; cron deletes expired. | curl downloads CSV; expired → 404 |
| 4 | Page + table shell | route, `ExportsClient`, `ExportsTable`, sidebar entry, gating, polling + auto-download. | Empty state; one CSV end-to-end in browser |
| 5 | Create drawer | type grid + format footer + Team Result filter panel. | Create from UI works |
| 6 | Call List + Results (PDF+CSV) | shared `pdf-doc` page-layout renderer. | Both formats; layouts differ |
| 7 | Judge List + Valuation Sheet | generators + filter panels. | Manual |
| 8 | Green Room Sign + Schedule Conflicts | generators (reuse conflict util). | Manual |
| 9 | Polish | filter badges/`+N`, failure state, read-only allowance, relative times. | Matches mockups |

Each phase = own branch + commit.

---

## Acceptance Criteria

- [ ] `festival_export` table + enums exist in `schema.ts` and a matching `drizzle/00XX_*.sql`.
- [ ] **Exports** appears in the sidebar for ADMIN/OWNER only, gated by the `exports` feature flag.
- [ ] Exports page renders header, subtitle, **New Export** button, and a polling table with columns Export Type / Summary (+ filter badges) / Status / Completed In / Queued At / Actions.
- [ ] "Create Export" drawer shows the export-type card grid, a per-type filter panel, and a sticky footer with PDF/CSV format toggle + Export button — matching the attached mockups.
- [ ] All seven data export types generate a correct file (PDF and/or CSV) from festival-scoped data with their documented filters applied.
- [ ] File bytes are stored in Neon `bytea`; **no Cloudinary / external storage** is used.
- [ ] Download streams the stored bytes with `Content-Disposition: attachment`; a completed row auto-downloads once, and stays re-downloadable until expiry.
- [ ] Rows and bytes are deleted 2 days after `queuedAt` by the daily cron.
- [ ] Exports work on PAST/EXPIRED (read-only) festivals.
- [ ] `PROCESSING → COMPLETED/FAILED` lifecycle is honoured; failures show a Failed status + `errorMessage`.

## Blocked by

None — can start immediately.

---

## References
- Route-handler helpers: `src/api/lib/create-handler.ts`, `src/api/lib/response.ts`
- Existing client-side PDF batch: `src/features/participants/services/qr-pdf-utils.ts`
- Schedule conflict logic: `src/features/schedule/actions/schedule.actions.ts` (`getTimeConflictError`, `ConflictParts`, `conflictPartsToMessage`)
- Table+drawer pattern: `src/app/dashboard/[slug]/content/news/NewsClient.tsx`
- Sidebar config: `src/config/sidebar.config.ts`, `src/components/festival/dashboard/FestivalDashboardSidebar.tsx`
- Access + session: `assertFestivalAccess`, `getSession` (see `src/features/posters/actions/poster-export.actions.ts`)
- Daily cron: `vercel.json` → `/api/v1/cron`
- UI primitives: `src/components/ui/{sheet,drawer,table,badge}.tsx`, `src/components/ui/delete-dialog`
- DB client (Neon): `src/core/database/client.ts`; Drizzle config: `drizzle.config.ts`
- Related infra decision: `issues/neon-database-adoption.md`
