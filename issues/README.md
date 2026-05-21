# Poster editor — issues workflow

This folder holds the **requirements harness** and **implementation issues** for the customizable print poster feature (Konva-based).

## UI prototype (before implementation)

Open **`/editor`** in dev (`npm run dev` → http://localhost:3000/editor) to try the Konva layout: template picker, FestAdmin fields, shapes, backgrounds, layers, fonts, export PNG. No database — local state only.

## How to work

1. Read **[HARNESS.md](./HARNESS.md)** once — product scope, plan rules (STANDARD + PRO), and how Greenroom implements features.
2. Pick **one open issue** (start with `001` unless it is blocked).
3. Tell the agent: *"Implement issue 003"* (or paste the issue path).
4. When done, mark the issue checklist complete and move to the next slice.

Issues are **vertical slices** (schema → server → UI → verify), not layer-only tickets.

## Issue index

| # | File | Title | Tier | Blocked by |
|---|------|-------|------|------------|
| 001 | [001-foundation-plan-flag-and-schema.md](./001-foundation-plan-flag-and-schema.md) | Foundation: plan flag, schema, types | STANDARD + PRO | — |
| 002 | [002-template-crud-and-storage.md](./002-template-crud-and-storage.md) | Template CRUD + background storage | STANDARD + PRO | 001 |
| 003 | [003-poster-renderer-engine.md](./003-poster-renderer-engine.md) | Shared poster renderer (Konva → image) | STANDARD + PRO | 002 |
| 004 | [004-candidate-card-editor.md](./004-candidate-card-editor.md) | Candidate card template editor (1050×600) | STANDARD + PRO | 003 |
| 005 | [005-candidate-card-export-qr-flow.md](./005-candidate-card-export-qr-flow.md) | Candidate card export in QR Codes | STANDARD + PRO | 004 |
| 006 | [006-result-poster-editor.md](./006-result-poster-editor.md) | Result poster template editor | STANDARD + PRO | 003 |
| 007 | [007-result-poster-export.md](./007-result-poster-export.md) | Per-programme result poster export | STANDARD + PRO | 006 |
| 008 | [008-team-points-poster-editor.md](./008-team-points-poster-editor.md) | Team points poster template editor | STANDARD + PRO | 003 |
| 009 | [009-team-points-poster-export.md](./009-team-points-poster-export.md) | Team points poster export | STANDARD + PRO | 008 |
| 010 | [010-posters-settings-hub.md](./010-posters-settings-hub.md) | Posters hub in dashboard settings | STANDARD + PRO | 004, 006, 008 |
| 011 | [011-pro-bulk-poster-exports.md](./011-pro-bulk-poster-exports.md) | PRO: bulk poster PDF/ZIP exports | PRO only | 005, 007, 009 |

**BASIC** does not get this feature (no `printPosters` flag).

## Status legend (edit in each issue)

- `[ ]` Open
- `[x]` Done
