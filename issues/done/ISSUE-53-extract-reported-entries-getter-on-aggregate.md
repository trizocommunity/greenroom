# Extract `reportedEntries()` getter on `reporting-session.aggregate`

## Status

- **Type**: Duplicated Code — AFK.
- **Blocked by**: None.
- **Blocks**: None.

## Summary

`ScratchGrid.tsx` and `LargeTimerDrawer.tsx` both render the A–Z reported-participant roster with the same shape:

- Sort by `localeCompare(..., { sensitivity: "base" })`
- Render `{name, code}` with the same Crown lead badge

Each call site had its own dedup logic, and the dedup rules actually differed (INDIVIDUAL by `assignmentId`, GROUP by `(groupId, teamNumber)` collapse). The pure dedup + sort logic lived in the UI layer where it couldn't be unit-tested.

## Proposed fix

1. ~~Add `reportedEntriesFromReportedRows(input)` on the reporting domain.~~ ✓ — lives in `src/features/programmes/domain/reported-entries.ts` (client-safe) and is re-exported from the aggregate for callers that already import it.
2. ~~Add `reportedEntriesFromScratchTiles(input)` for the deduped scratch-tiles case.~~ ✓
3. ~~Add `ReportedEntriesPanel` UI component consumed by both sites.~~ ✓
4. ~~Decide dedup rule per shape; document it.~~ ✓ — INDIVIDUAL keyed by `assignmentId`; GROUP keyed by `teamKey.partial({ groupId, teamNumber })` and the lead surfaced.

## Acceptance criteria

- [x] Sort + dedup + render-shaping logic exists exactly once in `reported-entries.ts`
- [x] Both UI sites consume the helper (no inline `Map` dedup)
- [x] `ReportedEntriesPanel` is the single render component
- [x] Behaviour unchanged in both places (manual smoke check pending)
- [x] `pnpm test:unit` passes
- [x] `pnpm build` passes

## Discovered during

Standards review of commit `bc56212`.

## Fixed in

`f2f6a0a` — `refactor(programme-reporting): reported-entries helpers, window transform, A-Z panel`