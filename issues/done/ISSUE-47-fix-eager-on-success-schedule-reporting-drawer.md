# Fix eager `onSuccess` in `ScheduleReportingDrawer`

## Status

- **Type**: Bug — AFK.
- **Blocked by**: None.
- **Blocks**: None directly, but ship-blocker for anyone using the schedule-side reporting drawer on flaky networks.

## Summary

`ScheduleReportingDrawer.tsx:48-76` calls `onSuccess()`, `onOpenChange(false)`, and the route push **before** awaiting `startProgrammeReportingAction`. On failure the drawer has already closed and the parent has already refreshed for nothing; the only signal the user gets is a toast.

## Context

```ts
const handleStart = () => {
  onSuccess();
  onOpenChange(false);
  if (slug) { router.push(`/dashboard/${slug}/event-works/reporting?...`); }
  (async () => {
    try {
      const res = await startProgrammeReportingAction(...);
      ...
```

Compare to the pre-refactor version, which only ran those mutations inside `if (res.success)`.

## Proposed fix

Move the success-state mutations inside the `if (res.success)` branch. On failure, the drawer stays open with a toast and the route is untouched.

## Acceptance criteria

- [x] Drawer does **not** close and route does **not** push on action failure
- [x] `onSuccess` only runs after the awaited action resolves with `success: true`
- [x] Behaviour on success is unchanged from today
- [x] `pnpm test:unit` passes (no regression in adjacent tests)

## Discovered during

Standards review of commit `6d93168` / `bc56212` (programme-reporting + judgement refactor).

## Fixed in

`dbe3b91` — `fix(schedule): only close drawer after start-reporting action succeeds`