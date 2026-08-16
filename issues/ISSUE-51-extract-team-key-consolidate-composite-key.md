# Extract `TeamKey` type, consolidate 5-copy composite key

## Status

- **Type**: Shotgun Surgery + Primitive Obsession — AFK.
- **Blocked by**: None.
- **Blocks**: None.

## Summary

The identity of "a team in a programme" — `programmeId × groupId × teamNumber` — was being spelled out as a stringly-typed composite key in 5 sites across 4 files. Two of those sites used a 2-field key, three used a 3-field key, all with the same separator `::`. This was a bug surface waiting to happen: any site that drops the `programmeId` prefix would collide across programmes.

## Context

| File:line | Shape | Separator |
|---|---|---|
| `src/features/programmes/actions/get-assignments.action.ts:76` | `${programmeId}::${groupId}::${teamNumber}` | `::` |
| `src/features/programmes/actions/get-assignments.action.ts:102` | `${programmeId}::${groupId}::${teamNumber}` | `::` |
| `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx:638` | `${groupId}::${teamNumber}` | `::` |
| `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx:681` | `${groupId}::${teamNumber}` | `::` |
| `src/components/festival/event-works/programme-reporting/LargeTimerDrawer.tsx:82` | `${groupId}::${teamNumber}` | `::` |
| `src/components/festival/event-works/programme-reporting/reporting-status.ts` | `${groupId}::${teamNumber}` (2 sites) | `::` |
| `src/features/programmes/services/programme-reporting.service.ts` | `${groupId}::${teamNumber}` (2 sites — bonus matches in `getReportingStats`) | `::` |

## Proposed fix

1. ~~Add `TeamKey` to a shared location under `src/features/programmes/` — `domain/team-key.ts`.~~ ✓
2. ~~Provide `teamKey.of(programmeId, groupId, teamNumber): TeamKey` and `teamKey.parse(s): TeamKey`.~~ ✓
3. ~~Replace all 5 sites with the helper.~~ ✓
4. ~~Where `programmeId` is not present in the call site, make sure the missing field is intentional and not a bug.~~ ✓ — 2-field sites are scoped to single-programme loops; helper provides `teamKey.partial()` for those.

## Acceptance criteria

- [x] `TeamKey` type declared once
- [x] All 5 sites use the helper
- [x] `git grep "::"` in the affected files returns nothing for team-key uses (verified — see follow-up)
- [x] `npm run test:unit` passes — especially any team-aggregation tests
- [x] `npm run build` passes

## Discovered during

Standards review of commits `bc56212` (programme-reporting) and `fe0cc16` (programme-assignments action).

## Fixed in

`f2f6a0a` — `refactor(programme-reporting): reported-entries helpers, window transform, A-Z panel`