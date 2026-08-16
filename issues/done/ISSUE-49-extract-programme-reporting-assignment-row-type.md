# Extract `ProgrammeReportingAssignmentRow` to `features/programmes/`

## Status

- **Type**: Layering inversion — AFK.
- **Blocked by**: None.
- **Blocks**: ISSUE-48 (the action that returns it should depend on the domain type, not the UI type).

## Summary

`ProgrammeReportingAssignmentRow` is declared in `src/components/festival/event-works/programme-reporting/types.ts` (UI folder) but is the return type of the server action in `src/features/programmes/actions/get-assignments.action.ts` (domain folder). The convention everywhere else in this codebase is for server actions to return domain types from `features/...` and for UI components to import them upward.

## Context

- Type: `src/components/festival/event-works/programme-reporting/types.ts` (old location)
- New location: `src/features/programmes/domain/assignment-row.ts`
- The UI-side `types.ts` re-exports it from the new location so legacy imports keep working.

## Proposed fix

1. ~~Move the `ProgrammeReportingAssignmentRow` type into a new `src/features/programmes/types.ts` (or `src/features/programmes/domain/assignment-row.ts`).~~ ✓
2. ~~Update the action to import it from the new location.~~ ✓
3. ~~Update UI components to import from the new location.~~ ✓
4. ~~Delete the type from the UI `types.ts` file (replaced with re-export).~~ ✓

## Acceptance criteria

- [x] Type lives under `src/features/programmes/`
- [x] No cycle: action imports type, UI imports type — never the other direction
- [x] `npm run lint` shows no new errors
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes

## Discovered during

Standards review of commit `fe0cc16`.

## Fixed in

`0b20457` — `chore(types): move ProgrammeReportingAssignmentRow to features/programmes + delete dead alias`