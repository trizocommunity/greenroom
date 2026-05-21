# 005 — Candidate card export in QR Codes flow

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [004](./004-candidate-card-editor.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §4.7, §3.3

## What to build

Wire candidate card template into **QR Codes** page: per-student JPEG download and PDF bulk export use the customizable template when saved; sensible fallback when no template exists.

## Acceptance criteria

- [ ] `QrCodesClient.tsx` uses `PosterRenderer` + saved `CANDIDATE_CARD` template when present
- [ ] Download JPEG per student produces **1050×600** (or template dimensions)
- [ ] Fallback: keep current simple 400×500 layout **or** block export with CTA “Configure candidate card” — product choice: **prefer CTA** if no template (document in PR)
- [ ] `exportStudentsQrPdfAction` updated **or** new client-side bulk PDF using candidate card dimensions (avoid tiny QR cells if template exists)
- [ ] Page `qr-codes/page.tsx` also requires `printPosters` for template features (keep `qrCodes` for page access)
- [ ] Link/button: “Edit candidate card template” → posters hub (issue 010) or inline route
- [ ] Read-only festival: downloads allowed, saves blocked

## Implementation notes

- Reuse `getQrCodeContent` — do not encode profile URL unless template binding chooses it.
- Filename pattern: `candidate-card-{chestNumber}.jpg`

## Files (expected touch)

- `src/components/festival/pre-event-works/qr-codes/QrCodesClient.tsx`
- `src/features/students/actions/qr.actions.ts` (if PDF path changes)
- `src/app/dashboard/[slug]/pre-event-works/qr-codes/page.tsx`

## Verify

- [ ] STANDARD festival: download one card, scan QR at reporting
- [ ] Bulk PDF with 2+ students renders readable cards
