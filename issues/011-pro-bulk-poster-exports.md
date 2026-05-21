# 011 — PRO: bulk poster PDF exports

**Type:** AFK  
**Tier:** PRO only (STANDARD: single exports only)  
**Blocked by:** [005](./005-candidate-card-export-qr-flow.md), [007](./007-result-poster-export.md), [009](./009-team-points-poster-export.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §2

## What to build

PRO-only bulk export actions: all candidate cards PDF, all result posters ZIP or multi-page PDF, team points poster single PDF (already one page). Gate on `bulkCertificateGeneration` **or** new `bulkPosterExport` flag — **decision: use `bulkCertificateGeneration` if marketing aligns posters with certificates; otherwise add `bulkPosterExport: true` only on PRO in same files as issue 001.**

## Acceptance criteria

- [ ] PRO tier can bulk-download **all students** as candidate cards (PDF), using template from 005
- [ ] PRO tier can bulk-download **all programmes with published results** as result posters (ZIP of JPEGs or one PDF per programme — pick one, document in PR)
- [ ] STANDARD attempting bulk receives upgrade message
- [ ] Server action or client batch with progress/toast for large festivals (500 students cap per STANDARD limits)
- [ ] Performance: batch in chunks to avoid OOM; optional cancel
- [ ] Does not bypass storage/export rate limits

## Implementation notes

- Reuse `jspdf` patterns from `qr.actions.ts`.
- Consider memory on Vercel serverless — client-side bulk may be safer for 500 JPEG renders; if server action, limit concurrency.

## Files (expected touch)

- `src/features/posters/actions/poster-bulk.actions.ts`
- PRO gate in `src/config/pricing.ts` (if new flag)
- UI buttons on QR Codes, Results, Leaderboard (PRO badge)

## Verify

- [ ] PRO festival: bulk candidate PDF for 10+ students
- [ ] STANDARD: bulk buttons hidden or upgrade CTA
