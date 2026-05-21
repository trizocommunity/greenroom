# 007 — Per-programme result poster export

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [006](./006-result-poster-editor.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §3.1

## What to build

From Event-works **Results**, allow downloading a result poster for a programme that has **published** results, using the `RESULT` template and live data.

## Acceptance criteria

- [ ] Button on results UI (e.g. `ResultsManagementClient` or programme row): “Download result poster”
- [ ] Visible only when `useFeature("printPosters")` and programme has ≥1 published result
- [ ] Client loads template + programme results → `PosterRenderer` → JPEG download
- [ ] Filename: `result-poster-{programmeSlugOrId}.jpg`
- [ ] Error toast if no template: prompt to configure in posters hub
- [ ] Only **published** rows count toward winner slots
- [ ] Server-side optional: `getResultPosterDataAction(programmeId)` returning binding DTO (keeps client thin)

## Implementation notes

- Reuse assignment display name logic from results table (student name vs group name).
- Position ordering: ascending `result.position`.

## Files (expected touch)

- `src/components/dashboard/results/ResultsManagementClient.tsx` (or sibling)
- `src/features/posters/actions/poster-export.actions.ts` (optional)

## Verify

- [ ] Publish results for a programme → download poster shows correct names/order
- [ ] Unpublished programme → button disabled or hidden
