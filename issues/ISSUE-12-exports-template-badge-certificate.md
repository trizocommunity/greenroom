# Exports — Template Visual Exports (Badge + Certificate)

## Status
- **Created**: 2026-07-30
- **Status**: Draft
- **Priority**: Medium
- **Complexity**: Medium-High
- **Vertical slice type**: AFK
- **Blocked by**: `ISSUE-11-exports-foundation-and-data-exports.md`

---

## Summary

Add the two **template-driven visual exports** to the Exports feature built in `ISSUE-11`: **Badge** (participant ID cards with chest number, team, category) and **Certificate** (participation & placement certificates). Unlike the data exports, these render from a festival's published **poster templates** (Konva documents), which only render on the client. So this slice adds a **client-side render → PDF → finalize-upload** path that plugs into the same `festival_export` job model, table, and download flow from `ISSUE-11`.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Rendering | **Client-side Konva**, reusing the poster-editor render path (`src/components/editor/*`, `src/features/posters/services/poster-editor-preview.service.ts`). No `node-canvas`, no Puppeteer. |
| 2 | Assembly | Rendered item images composited into a single PDF with `jspdf` (client-side), like `qr-pdf-utils.ts`. |
| 3 | Persistence | Client POSTs the finished PDF bytes to a **finalize** endpoint that writes them into the existing `festival_export.fileBytes` (Neon `bytea`). Same download/retention as `ISSUE-11`. |
| 4 | Job creation | `createExportAction` accepts BADGE/CERTIFICATE, creates the row as `PROCESSING`, and returns the resolved **bindings** for the client to render (server does the DB work, client does the pixels). |
| 5 | Quality | Screen / Standard / Print map to DPI; physical size derived from template pixel size — **fitting never upscales**. |
| 6 | Templates | Badge → published `CANDIDATE_CARD` templates; Certificate → published templates for certificates. Uses `PosterTemplateRepo`. |

---

## Problem Statement

`ISSUE-11` covers only DB-row exports (`jspdf`/`xlsx`, server-side). Badges and certificates are **pixel artefacts** defined by per-festival Konva templates that render only in the browser. They need a different pipeline, but must appear as the same kind of job in the same Exports table (queued → processing → completed → download, 2-day expiry).

---

## Out of Scope

- Editing poster templates (existing poster editor owns that).
- Server-side rasterisation of Konva.
- New export types beyond Badge and Certificate.

---

## Solution

### 1. Extend orchestrator for template types

`export-orchestrator.service.ts` (from `ISSUE-11`) gains a template branch: for BADGE/CERTIFICATE it validates config, resolves bindings server-side, creates the `festival_export` row as `PROCESSING`, and returns `{ exportId, templates, bindings }` **instead of** generating bytes. Reuse binding builders in `src/features/posters/` (`buildResultPosterBindings` and the candidate/team equivalents in `poster-editor-preview.service.ts`).

### 2. Finalize endpoint

`src/app/api/v1/exports/[id]/finalize/route.ts` (`createProtectedHandler`): accepts the client-rendered PDF (base64/blob), asserts festival access + ownership + `status === "PROCESSING"`, writes `fileBytes`, `fileSizeBytes`, `itemCount`, sets `status = "COMPLETED"`, `completedAt`, `completedInMs`. On client error, a companion call marks `FAILED` with `errorMessage`. Enforce a max byte size (badge PDFs can be large).

### 3. Client renderer

`src/app/dashboard/[slug]/exports/_components/ClientTemplateRenderer.tsx`: mounted (offscreen) when a BADGE/CERTIFICATE job is created. For each item it renders the template's Konva doc with that item's bindings, rasterises at the selected DPI (`stage.toDataURL({ pixelRatio })`), lays images into a `jspdf` doc per **Print Layout**, then POSTs to the finalize endpoint. Drives the same optimistic `PROCESSING` row already in the table.

### 4. Filter panels

`_components/filters/BadgeFilters.tsx` and `CertificateFilters.tsx`, added to the `NewExportDrawer` type grid from `ISSUE-11`:

**Badge** — Category multi-select · Team multi-select · Gender (All/Male/Female) · **Template** (published CANDIDATE_CARD) · **Export Quality** (Screen/Standard/Print) · **Print Layout** (One per page / Multiple per page) · ☑ only participants with chest numbers. Format locked to **PDF**.

**Certificate** — Categories multi-select · Competitions multi-select ("empty = all") · **Certificate Types** (Participation, 1st, 2nd, 3rd, Common Prize, Grade) · **Template** · **Export Quality** · **Print Layout** (One/Multiple per page). Format locked to **PDF**.

### 5. Type-card entries

Add **Badge** and **Certificate** cards to the export-type grid (icons per mockup: Badge = award/seal, Certificate = certificate). CSV toggle disabled for both.

---

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1 | Orchestrator template branch + bindings | BADGE/CERTIFICATE create → `PROCESSING` row + returned bindings. | Row created; bindings shape correct |
| 2 | Finalize endpoint | writes bytes, flips to `COMPLETED`; `FAILED` path. | curl finalize → downloadable PDF |
| 3 | Client renderer | offscreen Konva render → jspdf → finalize. | Badge PDF matches template |
| 4 | Badge filter panel + quality/layout | DPI mapping, no-upscale fit, One/Multiple per page. | Print vs Screen size differs; multi-up grid |
| 5 | Certificate filter panel + types | placement/participation resolution from `result`. | Correct certs per type |
| 6 | Polish | large-file guard, failure surfacing, empty-template state. | Manual |

---

## Acceptance Criteria

- [ ] **Badge** and **Certificate** appear as cards in the Create Export type grid (from `ISSUE-11`), PDF-only.
- [ ] Selecting a type shows its filter panel (template picker, quality, print layout, and the documented filters).
- [ ] Creating the export inserts a `PROCESSING` row in the same Exports table, using the same `festival_export` model.
- [ ] Items render **client-side via Konva** from the chosen published template with correct per-participant/per-result bindings.
- [ ] Export Quality maps to DPI; physical size is derived from template pixels and **artwork is never upscaled**.
- [ ] Print Layout produces one-per-page or multiple-per-page PDFs correctly.
- [ ] Finished PDF bytes are stored in `festival_export.fileBytes` (Neon), the row flips to `COMPLETED`, and it downloads/auto-downloads and expires exactly like data exports.
- [ ] Client render/finalize failures mark the row `FAILED` with a message; no orphaned `PROCESSING` rows.
- [ ] No Cloudinary, no server-side Konva, no Puppeteer.

## Blocked by

- `ISSUE-11-exports-foundation-and-data-exports.md` (needs the `festival_export` model, Exports page, table, drawer, download route, and retention).

---

## References
- Konva editor: `src/components/editor/*` (`poster-editor-types.ts`, `use-poster-editor-state.ts`, `editor-konva-props.ts`)
- Template bindings/preview: `src/features/posters/services/poster-editor-preview.service.ts`, `poster-bindings.service.ts`
- Existing export payload actions: `src/features/posters/actions/poster-export.actions.ts`
- Template repo + types: `src/features/posters/repositories/poster-template.repository.ts`, `types/poster-template.types.ts` (`CANDIDATE_CARD`, `RESULT`, `TEAM_POINTS`)
- Client PDF assembly precedent: `src/features/participants/services/qr-pdf-utils.ts`
- Route-handler helpers: `src/api/lib/create-handler.ts`, `src/api/lib/response.ts`
- Foundation this builds on: `issues/ISSUE-11-exports-foundation-and-data-exports.md`
