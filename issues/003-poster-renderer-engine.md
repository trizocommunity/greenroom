# 003 — Shared poster renderer (Konva → image)

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [002](./002-template-crud-and-storage.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §4.6, §5.3

## What to build

Install Konva dependencies and implement a **framework-agnostic** renderer that takes `{ template, bindings }` and returns a `Blob` (JPEG/PNG). No editor UI in this issue — renderer + binding resolver only.

## Acceptance criteria

- [ ] Dependencies added: `konva`, `react-konva` (renderer may use konva core only without React for export)
- [ ] `src/features/posters/services/poster-bindings.service.ts` — builds binding maps for:
  - [ ] `CANDIDATE_CARD` (student + group + chest + festival name)
  - [ ] `RESULT` (programme + category + winners by position)
  - [ ] `TEAM_POINTS` (team standings rows)
- [ ] `src/features/posters/services/poster-renderer.service.ts`:
  - [ ] Load konvaJson into off-DOM stage (document not required on server — **client-only** export function)
  - [ ] Replace text nodes by `bindingKey` (document convention in harness)
  - [ ] Inject QR as `Image` for `qrCode` binding using `qrcode` package
  - [ ] Load `backgroundUrl` image cross-origin safe for festival CDN URLs
  - [ ] `exportPosterBlob({ format: 'jpeg' | 'png', pixelRatio })`
- [ ] Default export pixelRatio documented (2x for print)
- [ ] Unit or integration test with minimal fixture JSON (if repo has vitest/jest; otherwise a `scripts/` smoke script)

## Implementation notes

- Export APIs must run in browser (`"use client"` helper or call from client components only).
- Do not SSR Konva stage.
- Winner slots: if no result for position N, binding value `—` and optional `visible: false` on layer.

## Files (expected touch)

- `package.json`
- `src/features/posters/services/*`

## Verify

- [ ] Render sample template + mock bindings → downloadable blob in dev console or smoke script
