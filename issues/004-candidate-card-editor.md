# 004 — Candidate card template editor (1050×600)

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [003](./003-poster-renderer-engine.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §3.3

## What to build

Konva-based visual editor for the **Candidate card** template: fixed canvas 1050×600, background upload, draggable text layers, QR placeholder region, save via issue 002 actions.

## Acceptance criteria

- [ ] `src/components/festival/posters/CandidateCardEditor.tsx` (client component)
- [ ] Loaded with `dynamic(..., { ssr: false })` from a thin wrapper
- [ ] Canvas size locked to **1050 × 600**
- [ ] Field palette / add-text for bindings: `festivalName`, `studentName`, `chestNumber`, `teamName`, `qrCode` (QR shown as placeholder box in edit mode)
- [ ] Background image upload → calls save action with `backgroundUrl`
- [ ] Save serializes `stage.toJSON()` and persists through `savePosterTemplateAction`
- [ ] Preview mode uses `PosterRenderer` with sample student data
- [ ] Uses shadcn UI consistent with `QrCodesClient` / settings forms
- [ ] `useFeature("printPosters")` hides editor when false

## Implementation notes

- Each bindable text node: `attrs.bindingKey = 'chestNumber'` (or agreed name field).
- QR placeholder: rect + label “QR”; renderer swaps for real QR on export.
- Pull default branding colors from `festival.branding` if available on props.

## Files (expected touch)

- `src/components/festival/posters/**`

## Verify

- [ ] Save reload restores layout
- [ ] Preview produces QR readable by existing reporting scan flow
