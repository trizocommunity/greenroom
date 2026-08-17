# Delete dead `ReportedParticipantsViewState` type alias

## Status

- **Type**: Dead code — AFK.
- **Blocked by**: None.
- **Blocks**: None.

## Summary

`src/components/dashboard/judgement/types.ts:108` declared `ReportedParticipantsViewState = ParticipantsViewState`. The alias was never imported anywhere in `src/` — it's a leftover from the judgement wizard refactor (commit `60ccefb`).

## Acceptance criteria

- [x] The type alias is removed
- [x] `git grep ReportedParticipantsViewState` returns nothing
- [x] `npm run lint` shows no new errors
- [x] `npx tsc --noEmit` passes

## Discovered during

Standards review of commit `60ccefb`.

## Fixed in

`0b20457` — `chore(types): move ProgrammeReportingAssignmentRow to features/programmes + delete dead alias`