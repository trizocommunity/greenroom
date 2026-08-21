# Wire up or rip out `getProgrammeAssignmentsAction`

## Status

- **Type**: Speculative Generality / dead code — AFK.
- **Blocked by**: None.
- **Blocks**: None.

## Summary

`src/features/programmes/actions/get-assignments.action.ts` was added in commit `fe0cc16` as a server action that joins `programmeAssignment` with `programmeAssignmentMember + programmeTeamLead` and assembles `ProgrammeReportingAssignmentRow[]`. The action is `"use server"` and compiles, but has **zero callers in `src/`** as of the commit that landed it.

## Context

- Action signature (as of `fe0cc16`): `getProgrammeAssignmentsAction(festivalId: string, programmeId: string): Promise<ProgrammeReportingAssignmentRow[]>`
- It returns the UI-side row shape imported from `src/components/festival/event-works/programme-reporting/types.ts`
- The author left a TODO comment on line 54: *"can be optimized but fine for now"*

## Decision: wire up

The reporting page (`src/app/dashboard/[slug]/event-works/reporting/page.tsx`) was fetching the same joins inline. Wired the action into the page and dropped the inline copy.

## Action signature change

Changed from `(festivalId, programmeId)` to `(festivalId)` — the page needs all programmes' assignments, not a single one. The teamLeads query is now joined via `programme` to filter by festival rather than the `programmeId` param.

## Acceptance criteria (option A — wire up)

- [x] `getProgrammeAssignmentsAction` is called from at least one production code path
- [x] The TODO comment on line 54 is resolved (programme-team-lead join now uses `programme.festivalId`)
- [x] No regression in `pnpm test:unit` or `pnpm build`

## Discovered during

Standards review of commit `fe0cc16`.

## Fixed in

`ed9f896` — `fix(programme-reporting): page calls getProgrammeAssignmentsAction, drop inline joins`