# Complete Template System — Editor Refactor, CERTIFICATE Type, Assignments, Consumption Points

## Status
- **Created**: 2026-08-02
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Blocks**: certificate downloads on participant profile, badge rendering in admin/public views
- **Internal dependency**: §1 (Editor Refactor) should land before §2–§5; §3 (Assignment System) before §5 (Consumption Points)

This issue consolidates the full template system completion:

1. **§1 — Editor Refactor & Redesign**: architectural cleanup of the Konva editor
2. **§2 — CERTIFICATE Template Type**: new type end-to-end (DB → editor → bindings → export)
3. **§3 — Template Assignment System**: unified assignment table replacing per-programme template selection
4. **§4 — Dedicated Templates Page**: new route with Templates + Assignments tabs
5. **§5 — Template Consumption Points**: where each template type is rendered/downloaded

§1 is independent. §2 can proceed in parallel with §1. §3 depends on §2 (needs CERTIFICATE type). §4 depends on §3 (needs assignment UI). §5 depends on §3 + §4.

---

# §1 — Editor Refactor & Redesign

## Summary

The existing Konva-based editor (~6000+ lines across 40+ files) has structural issues that need cleanup before new features are added.

### Code Architecture

| # | Task | Detail |
|---|------|--------|
| 1 | Split state hook | `use-poster-editor-state.ts` is 1081 lines with ~70+ returned properties. Split into focused sub-hooks: selection, history, clipboard, templates, etc. |
| 2 | Deduplicate rendering | Element rendering is duplicated between `PosterEditorCanvas.tsx` (interactive) and `PosterExportCanvas.tsx` (export). Extract shared renderer. |
| 3 | Consolidate type definition | `PosterTemplateType` is defined in both `poster-editor-config.ts` and `poster-template.types.ts`. Single source of truth. |
| 4 | Wire inline text editor | `inline-text-editor.tsx` exists but is not connected. Enable double-click-to-edit on canvas. |
| 5 | Real QR codes | Canvas currently renders QR elements as dashed placeholder rectangles. Render actual QR codes. |
| 6 | Lazy-load fonts | All 40+ Google Fonts load eagerly on mount. Load on demand. |
| 7 | Efficient undo/redo cloning | Replace `JSON.parse(JSON.stringify())` deep-clone with a more efficient approach. |

### UX Improvements

Details TBD during implementation — visual polish, layout refinements.

### Acceptance Criteria

- [ ] State hook split into ≤200-line sub-hooks
- [ ] Single element renderer used by both interactive canvas and export canvas
- [ ] `PosterTemplateType` defined in one file only
- [ ] Double-click text element on canvas opens inline editor
- [ ] QR elements render actual QR codes
- [ ] Fonts load lazily (only when used or browsed)
- [ ] No functional regressions in existing editor features

---

# §2 — Add `CERTIFICATE` Template Type

## Summary

Add `CERTIFICATE` as a new template type, end-to-end from database to editor to export.

### Database Migration

| # | Change | Detail |
|---|--------|--------|
| 1 | Add enum value | `CERTIFICATE` added to `PosterTemplateType` enum |
| 2 | Drop column | Remove `programme.result_poster_template_code` (replaced by assignment system in §3) |

### Editor Config

| # | Change | Detail |
|---|--------|--------|
| 1 | `TEMPLATE_TYPES` array | Add `CERTIFICATE` entry — emoji: 📜, title: "Certificate", dimensions: **2100 × 1485 px** (landscape A4) |
| 2 | `TEMPLATE_TYPES` array | Add `TEAM_POINTS` entry (currently in type union but missing from the array) |
| 3 | Template code prefix | `CERT-{suffix}`, default: `CERT-DEFAULT` |
| 4 | No slot limit | Certificates allow unlimited published templates (unlike RESULT which caps at 2) |

### Binding Fields for `CERTIFICATE`

| Field | Key | Preview | Template Types |
|-------|-----|---------|----------------|
| Fest Name | `festName` | "Greenroom Arts Fest" | all (existing) |
| Date | `festDate` | "21 May 2026" | all (existing) |
| Location | `festLocation` | "Main Auditorium" | all (existing) |
| Certificate Title | `certificateTitle` | "Certificate of Participation" | CERTIFICATE (new) |
| Participant Name | `participantName` | "Candidate Name" | CERTIFICATE, CANDIDATE_CARD |
| Programme | `programmeName` | "Folk Dance — Group" | CERTIFICATE, RESULT |
| Category | `categoryName` | "Category A" | CERTIFICATE, RESULT, CANDIDATE_CARD |
| Place / Institution | `placeName` | "St. Mary's School" | CERTIFICATE, RESULT, CANDIDATE_CARD |
| Result Label | `resultLabel` | "1st Prize" | CERTIFICATE, RESULT |
| Chest No | `chestNumber` | "0000" | CERTIFICATE, CANDIDATE_CARD |
| Team | `teamName` | "House Blue" | CERTIFICATE, CANDIDATE_CARD, TEAM_POINTS |

### `certificateTitle` Auto-Generation at Export Time

| Certificate Type | Generated Title |
|-----------------|-----------------|
| `PARTICIPATION` | "Certificate of Participation" |
| `FIRST` | "Certificate of First Place" |
| `SECOND` | "Certificate of Second Place" |
| `THIRD` | "Certificate of Third Place" |
| `COMMON_PRIZE` | "Certificate of Common Prize" |
| `GRADE` | "Certificate of Grade" |

### Service Changes

- [ ] Add `buildCertificateBindings()` to `poster-bindings.service.ts`
- [ ] Add `loadCertificatePreview()` to `poster-editor-preview.service.ts`
- [ ] Add placeholder bindings for certificate in `poster-editor-preview-placeholders.ts`
- [ ] Add `certificateTitle` to resolved bindings in `template-payload.service.ts` → `resolveCertificatePayload()`

### Template Code Utils (`template-code.ts`)

- [ ] `templateTypeFromCode()` — handle `CERT-*` prefix → `CERTIFICATE`
- [ ] `validateTemplateCode()` — accept `CERT-{suffix}` pattern
- [ ] `defaultCodeForType()` — `CERTIFICATE` → `CERT-DEFAULT`

### Acceptance Criteria

- [ ] `CERTIFICATE` in DB enum via migration
- [ ] `programme.result_poster_template_code` column dropped
- [ ] Editor shows Certificate as a template type option (2100×1485)
- [ ] `certificateTitle` binding field available in editor for CERTIFICATE type
- [ ] Preview service generates realistic certificate preview data
- [ ] Export payload includes auto-generated `certificateTitle`
- [ ] `TemplatesClient` shows `CERTIFICATE` and `TEAM_POINTS` in `TYPE_LABELS`

---

# §3 — Template Assignment System

## Summary

A unified assignment table that maps published templates to their usage context. Replaces the old per-programme result template selection (where the announcer picked templates at announce time). Now handled by the Media team.

### Database — New Table: `festival_template_assignment`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | PK |
| `festival_id` | text | FK → `festival.id`, CASCADE delete |
| `template_code` | text | The published template code |
| `assignment_kind` | enum | `RESULT_RANGE`, `CERTIFICATE_TYPE`, `BADGE`, `TEAM_POINTS` |
| `from_result_no` | integer, nullable | Only for `RESULT_RANGE` |
| `to_result_no` | integer, nullable | Only for `RESULT_RANGE` |
| `certificate_type` | text, nullable | Only for `CERTIFICATE_TYPE` (PARTICIPATION, FIRST, SECOND, THIRD, COMMON_PRIZE, GRADE) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Indexes:**
- Unique: `(festival_id, assignment_kind, certificate_type)` for `CERTIFICATE_TYPE` rows
- Unique: `(festival_id, assignment_kind)` for `BADGE` and `TEAM_POINTS` rows (one at a time)
- Index: `(festival_id, assignment_kind)` for queries

### Assignment Kinds

| Kind | Behavior | Cardinality |
|------|----------|-------------|
| `RESULT_RANGE` | Maps a result number range to a `RESULT-*` template | Multiple rows (non-overlapping ranges) |
| `CERTIFICATE_TYPE` | Maps a certificate type to a `CERT-*` template | One row per certificate type |
| `BADGE` | Sets the active `CARD-*` template for badges | One row at a time |
| `TEAM_POINTS` | Sets the active `TEAM-*` template for team points | One row at a time |

### Server Actions & Repository

- [ ] CRUD actions for template assignments
- [ ] Validation: no overlapping result number ranges
- [ ] Validation: only published templates can be assigned
- [ ] Query: resolve template for a given result number (lookup by range)
- [ ] Query: resolve template for a given certificate type
- [ ] Query: get active badge / team points template

### Remove Old Flow

- [ ] Remove announcer template selection from announce workflow
- [ ] Clean up all references to `programme.resultPosterTemplateCode`

### Acceptance Criteria

- [ ] `festival_template_assignment` table created via migration
- [ ] CRUD actions work for all four assignment kinds
- [ ] Overlapping result ranges are rejected
- [ ] Only published templates can be assigned
- [ ] Announcer no longer picks templates — media/admin assigns via assignment UI
- [ ] Old `programme.result_poster_template_code` references fully removed

---

# §4 — Dedicated Templates Page

## Summary

New dashboard route with two tabs, replacing the templates section in Settings.

### Route: `/dashboard/[slug]/templates`

- [ ] Create page at `src/app/dashboard/[slug]/templates/page.tsx`
- [ ] **Templates tab** — existing template list/grid (create, edit, publish, delete) via `TemplatesClient`
- [ ] **Assignments tab** — mapping UI for all four assignment kinds:
  - Results: add rows mapping result number ranges → published `RESULT-*` templates
  - Certificates: for each certificate type, pick a published `CERT-*` template
  - Badge: pick one published `CARD-*` template
  - Team Points: pick one published `TEAM-*` template

### Sidebar

- [ ] Add "Templates" item in **Event Works** group, before "Exports"
- [ ] Icon: `LayoutTemplate` (already imported but unused in sidebar config)
- [ ] Allowed roles: `ADMIN`, `OWNER`, `MEDIA`

### Cleanup

- [ ] Remove templates section from the Settings page

### Acceptance Criteria

- [ ] `/dashboard/[slug]/templates` renders with two tabs
- [ ] Templates tab shows all template types in the grid
- [ ] Assignments tab allows managing all four assignment kinds
- [ ] Sidebar shows "Templates" with correct icon and role gating
- [ ] Settings page no longer shows templates section

---

# §5 — Template Consumption Points

## Summary

Where each template type is actually rendered and used.

### Result Templates

| Surface | Detail |
|---------|--------|
| Public result/announcement pages | Resolve template by result number range via assignment table |
| Managed by | Media team (not announcer) |

### Certificate Templates

| Surface | Detail |
|---------|--------|
| Exports | Existing certificate export flow uses assigned `CERT-*` template per certificate type |
| Participant profile page | List of all certificates earned, each with individual download button. Template resolved via assignment table by certificate type. |

### Badge Templates (Candidate Card)

| Surface | Detail |
|---------|--------|
| Exports | Existing badge export flow uses the assigned `CARD-*` template |
| Participant public profile page | Render the participant's badge using the assigned template |
| Admin dashboard participant dialog | Show the badge in the participant detail view |

### Team Points Templates

| Surface | Detail |
|---------|--------|
| Exports only | Uses the assigned `TEAM-*` template |

### Acceptance Criteria

- [ ] Result posters on public pages use range-based template resolution
- [ ] Participant profile shows downloadable certificates (one per earned certificate)
- [ ] Participant profile shows their badge card
- [ ] Admin participant dialog shows the badge card
- [ ] Team points template used in exports
- [ ] All surfaces gracefully handle "no template assigned" (hide section, not error)

---

## Access Control

- Template management (create/edit/publish/assign): `ADMIN`, `OWNER`, `MEDIA`
- No changes to existing `canManageTemplates` role check

## Pricing / Feature Flags

- `templates` feature: available on ALL tiers (BASIC, STANDARD, PRO)
- `customCertificateTemplates`: PRO only (existing gate)
