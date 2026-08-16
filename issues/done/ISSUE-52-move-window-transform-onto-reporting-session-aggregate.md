# Move window transform onto `reporting-session.aggregate`

## Status

- **Type**: Feature Envy + Divergent Change — AFK.
- **Blocked by**: None.
- **Blocks**: None.

## Summary

`src/features/programmes/services/programme-reporting.service.ts:565-580` was computing `Date.now() + (endMs - startMs)` — re-anchoring a duration onto wall-clock — to derive a `windowEndsAt`. The aggregate (`src/features/programmes/domain/reporting-session.aggregate.ts`) already owns `windowEndsAt` state and clears it on `reset`, `reopen`, and `unlockForScheduleChange`. The service was reaching into schedule data the aggregate has no business knowing about.

Edge-case semantics decided: anchor on `nowMs` and add the scheduled duration (`scheduleEndMs - scheduleStartMs`). If reporting opens late, the judge still gets the full scheduled duration counted from the moment the session closed — they are not penalised for upstream delays.

## Proposed fix

1. ~~Add a method on `reporting-session.aggregate.ts` (e.g. `computeWindowEndsAt({ startMs, endMs, nowMs })`).~~ ✓ — pure function, clock injected, deterministic.
2. ~~Service delegates to that method instead of computing inline.~~ ✓
3. ~~Decision on edge-case semantics documented in code comment.~~ ✓

## Acceptance criteria

- [x] `Date.now() + ...` does not appear in the service (replaced with `computeWindowEndsAt(...)`)
- [x] Aggregate exposes the window calculation as a named export (`computeWindowEndsAt`)
- [x] Decision on edge-case semantics is documented in code comment
- [x] `npm run test:unit` passes — 5 new tests cover the helper
- [x] `npm run build` passes

## Discovered during

Standards review of commit `bc56212`.

## Fixed in

`f2f6a0a` — `refactor(programme-reporting): reported-entries helpers, window transform, A-Z panel`