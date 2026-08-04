# Stage-Manager Scoping + Schedule Flexibility + Unscheduled Reporting

## Status
- **Created**: 2026-08-02
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Blocks**: any future per-stage-permission work; any off-stage reporting; any "edit existing schedule" UX for STAGE_MANAGER
- **Internal dependency**: Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 (linear); Slice 6 (tests) runs against each slice

This issue consolidates **six concerns** that all touch the same surface (schedule / reporting / judgement) and the same role (STAGE_MANAGER):

1. **Schedule lower bound** — allow any date up to `festival.endDate` (off-stage programmes can be scheduled before the festival starts).
2. **Unscheduled reporting** — programmes with assignments but no schedule entry can be reported against (no longer requires a `scheduleEntry`).
3. **Reporting stage-scoping server-side** — `getProgrammeReportingBoardAction` honours `accessibleStageIds` instead of relying on a page-level post-filter.
4. **Schedule write guards** — STAGE_MANAGER can only create/update/delete/reorder entries on their assigned stages; admin = all stages.
5. **Programme dropdown hygiene** — programmes already scheduled (anywhere) never appear in the Add-to-Schedule dropdown; the rule lives in a server action, not just the page.
6. **Judgement reads stage-scoped** — `judgeProgrammes` and `rejudgeProgrammes` honour `accessibleStageIds`; the wizard gains an in-page stage filter (single-stage auto-lock, multi-stage dropdown) mirroring `ScheduleClient` / `ProgrammeReportingClient`.

Plus a small UX polish: the schedule day tabs auto-scroll to the active day for better mobile scroll.

---

## Summary

Right now STAGE_MANAGERs get a confused view of the festival:

- **Schedule**: the *read* is DB-scoped by `accessibleStageIds` (`schedule.actions.ts:127-138`), but the *write* path is not — a STAGE_MANAGER can create/update/delete entries on stages they aren't assigned to. Null-stage schedule entries are visible to STAGE_MANAGERs even though they can't create them. There is also a date mismatch bug: any schedule entry outside `festival.startDate..endDate` is rejected with `"That date is outside your festival event dates."`, which blocks off-stage programmes that need to be scheduled before the festival opens.
- **Reporting**: the `getProgrammeReportingBoardAction` server action returns *all* programmes in the festival; the page-level post-filter at `reporting/page.tsx:92-98` is the only scoping. Anyone calling the action via REST or another UI path sees every programme. There is also no way to start reporting on a programme that has assignments but no schedule entry (e.g. an off-stage programme).
- **Judgement**: `getJudgementWizardDataAction`, `getActiveJudgementConfigsAction`, `getJudgedProgrammeCardsAction`, and `getJudgementDashboardDataAction` are all festival-wide, with no DB-side stage filter and no page-level filter. The wizard has no stage filter dropdown at all. Writes are correctly scoped via `assertStageManagerAccessForStage` already.

This issue fixes all three surfaces end-to-end, plus the schedule-lower-bound and day-tab UX, then locks the behaviour in with tests.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Schedule lower bound | **Drop** entirely. Allow any date up to `festival.endDate`. |
| 2 | Off-stage vs on-stage rules | Same rule for both — any date up to `endDate`. |
| 3 | Day tabs UX | Already come from `Object.keys(groupedByDay).sort()` (only added days). Add `scrollbar-hide` + `snap-x snap-mandatory` + auto-scroll-to-active. |
| 4 | Unscheduled reporting | `programmeReportingSession.scheduleEntryId` becomes **nullable**. Drop the UNIQUE index on it; add UNIQUE on `(festivalId, programmeId)`. Reporting list pulls from **assigned programmes**, not schedule entries. |
| 5 | Judgement behaviour | **No change** to the status filter (`STARTED` ∪ `REPORTING + CLOSED session`). Rejudge list (`JUDGED` ∪ `ENDED`) stays scoped to the same stages. |
| 6 | Reporting slices | **Single slice** (merged `listByFestival` rewrite + stage scoping + unscheduled rendering). |
| 7 | Stage manager write scope | STAGE_MANAGER = assigned stages only. ADMIN / owner / SUPER_ADMIN = all stages. |
| 8 | Programme dropdown | Programmes already scheduled (anywhere in the festival) **never** appear in the Add-to-Schedule dropdown. Rule lives in a server action; defence-in-depth check at write time. |
| 9 | Null-stage schedule entries | Hide from STAGE_MANAGERs. The form requires a stage anyway, so the write guard rejects null-stage writes from STAGE_MANAGERs. |
| 10 | Rejudge list scoping | Same scoping as `judgeProgrammes` (joined via latest CLOSED session's stage). |
| 11 | Judgement UI behaviour | Single-stage = auto-lock; multi-stage = dropdown; `hideStageFilter` hides the dropdown and relies on the cookie-driven banner selector. |
| 12 | REST `/api/v1/schedule` | Same guard as server actions. STAGE_MANAGERs can hit it but only for their stages. |
| 13 | Migration | Track A (schema.ts) + Track B (hand-authored `drizzle/00XX_*.sql`). Drop the UNIQUE index on `scheduleEntryId`; add UNIQUE on `(festivalId, programmeId)`. |
| 14 | Execution | Six slices, shipped in one PR (or six stacked commits — TBD). |

---

## Problem Statement

1. **Date mismatch bug** — schedule entries before `festival.startDate` are rejected. Off-stage programmes (registration desks, hospitality, signage) need to be scheduled *before* the festival opens; today's validation blocks them.
2. **Reporting can't start on unscheduled programmes** — `programmeReportingSession.scheduleEntryId` is `notNull` and `UNIQUE`. Programmes with assignments but no schedule entry have no reporting session, so `start` fails.
3. **Stage managers see all programmes on the reporting board** — the page-level post-filter at `reporting/page.tsx:92-98` is the only scoping. The server action itself is unscoped, and any future caller would see everything.
4. **Stage managers can edit any stage's schedule** — `createScheduleEntry` / `updateScheduleEntry` / `deleteScheduleEntry` / `reorderScheduleEntries` / `checkScheduleConflict` only check `assertFestivalAccess` + tier. A STAGE_MANAGER on Stage A can edit Stage B's entries.
5. **Programme dropdown shows already-scheduled programmes** — the page-level filter at `pre-event-works/schedule/page.tsx:50-62` is the only filter. REST/other callers see the full list.
6. **Judgement wizard shows every programme in the festival** — no DB-side filter, no page-level filter, no UI affordance to lock to a stage.
7. **Null-stage schedule entries are visible to STAGE_MANAGERs** — the read filter's `or(isNull(stageId), inArray(stageId, ids))` allows them through, but STAGE_MANAGERs can't create them.

---

## Out of Scope

- Locking specific *judges* to specific stages (different table — `judgeStageAssignment`).
- Multi-festival cross-scope reporting.
- Editing existing STAGE_MANAGER assignments (`StageAssignmentService.assign`/`unassign`; admin-only path).
- Stage portal (the cookie-pinned `/stage-portal` surface) — already single-stage by design.
- Hierarchical "stage groups" or "stage hierarchies".
- Reordering across stages (drag-drop from one stage to another).
- Per-timezone lower bound (we use `festival.timezone` for day-key math).

---

## Solution

### Slice 1 — Reporting refactor (schema + service + stage scoping + unscheduled)

**Goal:** Unscheduled programmes can report; reporting list is stage-scoped server-side.

#### 1.1 Schema change → `src/core/database/schema.ts:1064-1126`

```ts
export const programmeReportingSession = pgTable(
  "programme_reporting_session",
  {
    // ...existing columns
    scheduleEntryId: text(),                // was: text().notNull()
    festivalId: text().notNull(),
    programmeId: text().notNull(),
    // ...rest unchanged
  },
  (table) => [
    // DROP: uniqueIndex("programme_reporting_session_scheduleEntryId_key")
    // NEW:
    uniqueIndex("programme_reporting_session_festivalId_programmeId_key")
      .using("btree",
        table.festivalId.asc().nullsLast(),
        table.programmeId.asc().nullsLast()),
    // ...rest unchanged
  ],
);
```

#### 1.2 Migration → `drizzle/00XX_programme_reporting_nullable_schedule_entry.sql`

Hand-authored Track B migration:
```sql
ALTER TABLE "programme_reporting_session" ALTER COLUMN "scheduleEntryId" DROP NOT NULL;
DROP INDEX IF EXISTS "programme_reporting_session_scheduleEntryId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "programme_reporting_session_festivalId_programmeId_key"
  ON "programme_reporting_session" USING btree ("festivalId" ASC NULLS LAST, "programmeId" ASC NULLS LAST);
```

#### 1.3 Reporting service → `src/features/programmes/services/programme-reporting.service.ts`

- New `listByFestival(festivalId, session)`:
  - Pull `accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(festivalId, session)`.
  - Query `programme` rows for the festival where `programme.assignments` is non-empty.
  - Left-join the **latest** `programmeReportingSession` per `(festivalId, programmeId)`.
  - Left-join an optional `scheduleEntry` (if one exists) for stage + start time display.
  - Where `accessibleStageIds !== "all"`, apply `or(isNull(scheduleEntry.stageId), inArray(scheduleEntry.stageId, accessibleStageIds))` (null-stage programmes always visible).
- New `getOrCreateSessionByProgramme(programmeId, festivalId)`:
  - Looks up by `(festivalId, programmeId)` (uses the new UNIQUE index).
  - Creates a new session row with `scheduleEntryId = null`, `stageId = (latest schedule entry's stageId?) or null`, `status = "NOT_STARTED"`.
- New `startByProgramme(programmeId, festivalId, actorName)`:
  - No `scheduleEntryId` parameter.
  - Pulls stage from the session (already populated).
- Keep `unlockByScheduleEntryChange` (called from `schedule-orchestration.ts`) but make it a no-op when no session exists.
- `markParticipant`, `markParticipantsBulk`, `close`, `reopenClosedSession`, `assignCodesWithSpin`, `resetSpinCodeLetters`, `getReportingStats` — work as-is; callers pass the session ID from `getOrCreateSessionByProgramme`.

#### 1.4 Reporting actions → `src/features/programmes/actions/programme-reporting.actions.ts`

- `startProgrammeReportingAction(festivalId, scheduleEntryId)` → `startProgrammeReportingAction(festivalId, programmeId)`.
- `resetProgrammeReportingAction`, `closeProgrammeReportingAction`, `reopenProgrammeReportingAction`, `reopenProgrammeReportingByProgrammeAction`, `scanAndReportParticipantAction`, `assignCodeLettersWithSpinAction`, `resetSpinCodeLettersAction` — no signature change (already keyed by `reportingSessionId` or `programmeId`).
- Drop `getStageIdForScheduleEntry` (no longer needed). Keep `getStageIdForReportingSession`.

#### 1.5 Reporting client → `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

- Render an **Unscheduled** section (or merge with the existing list) showing programmes that have assignments but no schedule entry. Each row has a "Start reporting" button that calls `startProgrammeReportingAction(festivalId, programmeId)` directly.
- Existing "Scheduled" section continues to show programmes with `IN_PROGRESS` / `RESET` / `CLOSED` sessions — source of truth is now the session/programme join, not the schedule-entry list.
- Stage filter keeps the same behaviour (`hideStageFilter` + `initialStageId` from cookie).

#### 1.6 Reporting types → `src/components/festival/event-works/programme-reporting/types.ts`

Widen `ReportingBoardItem`:
- `scheduleEntry: null` (was: required).
- `programme: Programme` (always present — was: optional).
- `reportingSession: ReportingSession | null` (already nullable).

#### 1.7 Page → `src/app/dashboard/[slug]/event-works/reporting/page.tsx`

Remove the page-level post-filter at lines 92-98 (now redundant). Continue to pass `hideStageFilter` + `initialStageId` to the client. Continue to scope `festivalStages` to the manager's stages.

---

### Slice 2 — Schedule validation lower bound + programme dropdown hygiene + day-tab auto-scroll

**Goal:** Validate any date up to `endDate`; programme dropdown excludes already-scheduled programmes; day tabs auto-scroll.

#### 2.1 Validation → `src/features/schedule/utils/schedule-times-validation.ts`

Replace the bounded `getFestivalDateKeySet` lookup with an upper-bound check:

```ts
const endKey = formatInTimeZone(parseInstant(festival.endDate)!, tz, "yyyy-MM-dd");
if (key > endKey) {
  return { ok: false, error: "That date is after your festival event end date." };
}
```

Keep the "festival dates missing" guard, the day-key regex check, the start/end ordering, and the same-calendar-day check.

#### 2.2 Helper → `src/features/schedule/utils/festival-schedule-days.ts`

Add `getScheduleDateKeyUpperBound(festival: { endDate: string | null }, tz: string = DEFAULT_TZ): string | null`:
- Returns `formatInTimeZone(parseInstant(festival.endDate)!, tz, "yyyy-MM-dd")` or `null` if `endDate` is missing/invalid.

`getFestivalDateKeySet` stays for the judgement `getStagePortalBoardAction` (line 974) which legitimately wants the bounded day set.

#### 2.3 Programme dropdown → `src/features/schedule/actions/schedule.actions.ts`

New `getSchedulableProgrammesAction(festivalId)`:
- Returns programmes where the programme has at least one assignment AND no schedule entry in the festival.
- Single source of truth — replaces the page-level filter.

`createScheduleEntry` gets a defence-in-depth check after `validateScheduleTimesForFestival`:
```ts
const existing = await db.query.scheduleEntry.findFirst({
  where: and(
    eq(scheduleEntryTable.festivalId, festivalId),
    eq(scheduleEntryTable.programmeId, data.programmeId),
    eq(scheduleEntryTable.type, "PROGRAMME"),
  ),
});
if (existing) {
  return { success: false, error: "That programme is already scheduled." };
}
```

#### 2.4 ScheduleClient → `src/components/festival/pre-event-works/schedule/ScheduleClient.tsx`

- `getFestivalDateOptions` (line 114): widen to "no lower bound, upper bound = endDate". Practically: drop the lower bound from the loop, cap at endDate.
- Day tabs (line 540–567):
  - Add `scrollbar-hide snap-x snap-mandatory`.
  - Add a `useRef<Record<string, HTMLButtonElement | null>>({})` keyed by `dayKey`.
  - Add a `useEffect` watching `effectiveActiveDay`; on change, call `tabRefs.current[dayKey]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })`.

#### 2.5 Page → `src/app/dashboard/[slug]/pre-event-works/schedule/page.tsx`

- Replace the local `scheduledProgrammeIds` filter at lines 50-62 with `getSchedulableProgrammesAction(festival.id)`.
- `getStages(festival.id)` already respects `accessibleStageIds`; keep as is.

---

### Slice 3 — Schedule write guards (stage-manager scoping)

**Goal:** Stage managers can only schedule on their assigned stages.

#### 3.1 Schedule actions → `src/features/schedule/actions/schedule.actions.ts`

For each of `createScheduleEntry`, `updateScheduleEntry`, `deleteScheduleEntry`, `reorderScheduleEntries`, `checkScheduleConflict`:

```ts
const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(festivalId, session);
if (accessibleStageIds !== "all" && stageId && !accessibleStageIds.includes(stageId)) {
  return { success: false, error: "You can only schedule on your assigned stages." };
}
```

- `createScheduleEntry` (line 242-348): guard `data.stageId` after `assertStageBelongsToFestival`.
- `updateScheduleEntry` (line 350-478): guard `newStageId` after the existing checks.
- `deleteScheduleEntry` (line 480-509): fetch the entry's `stageId` first, then guard.
- `reorderScheduleEntries` (line 511-572): verify every entry's `stageId` is in `accessibleStageIds` (or `"all"`).
- `checkScheduleConflict` (line 172-232): guard the `stageId` parameter.

#### 3.2 Read filter → `src/features/schedule/actions/schedule.actions.ts:127-138`

Drop the `or(isNull(stageId), ...)` branch from the read filter when `accessibleStageIds !== "all"`:

```ts
// STAGE_MANAGER: only their stages; null-stage entries hidden
where: and(
  eq(scheduleEntryTable.festivalId, festivalId),
  typeFilter ? eq(scheduleEntryTable.type, typeFilter) : undefined,
  accessibleStageIds === "all"
    ? undefined
    : accessibleStageIds.length > 0
      ? inArray(scheduleEntryTable.stageId, accessibleStageIds)
      : undefined,
),
```

ADMIN / owner / SUPER_ADMIN (who get `"all"`) still see null-stage entries via the un-filtered branch.

#### 3.3 REST API → `src/app/api/v1/schedule/route.ts`

Add the same `getAccessibleStageIds` guard to both GET and POST. The handler currently filters only by `festivalId` + `typeFilter`.

---

### Slice 4 — Judgement server-action scoping

**Goal:** Judgement reads only return programmes on the manager's stages; rejudge list scoped identically.

#### 4.1 Wizard data → `src/features/judgement/actions/judgement.actions.ts:78-117`

`getJudgementWizardDataAction`:
- Call `StageAssignmentService.getAccessibleStageIds(festivalId, session)`.
- If `accessibleStageIds !== "all"`, restrict `judgeProgrammes` and `rejudgeProgrammes` by joining the **latest CLOSED reporting session's `stageId`**:
  ```ts
  exists(
    db.select({ one: sql`1` })
      .from(reportingSessionTable)
      .innerJoin(scheduleEntryTable, eq(scheduleEntryTable.id, reportingSessionTable.scheduleEntryId))
      .where(
        and(
          eq(reportingSessionTable.programmeId, programmeTable.id),
          eq(reportingSessionTable.status, "CLOSED"),
          inArray(scheduleEntryTable.stageId, accessibleStageIds),
        ),
      ),
  )
  ```
- For `STARTED` programmes with no closed session yet, fall back to the programme's `scheduleEntry.stageId` via a left-join (`inArray`).
- For programmes with neither (unscheduled + reporting started), use `programmeReportingSession.stageId` directly.

#### 4.2 Active configs → `src/features/judgement/actions/judgement.actions.ts:377-416`

`getActiveJudgementConfigsAction`:
- Filter `judgementConfig` by `stageId in accessibleStageIds` (or no filter when `"all"`).

#### 4.3 Judged cards → `src/features/judgement/actions/judgement.actions.ts:418-669`

`getJudgedProgrammeCardsAction`:
- Same join via latest CLOSED session's stage.

#### 4.4 Dashboard data → `src/features/judgement/actions/judgement.actions.ts:671-696`

`getJudgementDashboardDataAction`:
- Pass `accessibleStageIds` to each child loader; delegate.

---

### Slice 5 — Judgement UI lock

**Goal:** Single-stage = auto-lock; multi-stage = dropdown.

#### 5.1 Page → `src/app/dashboard/[slug]/event-works/judgement/page.tsx`

Mirror `schedule/page.tsx:70-92`:
- Call `getAccessibleStageIds` (via `findFestivalById` + `StageAssignmentService`).
- Derive `isStageManager` from `context?.role === "STAGE_MANAGER"`.
- Read `initialStageId` from `getStageFilterCookie(festival.id, stages.map(s => s.id))`.
- Pass `initialStageId` + `hideStageFilter={isStageManager}` to `JudgementWizardClient`.
- Filter `judgeProgrammes` / `rejudgeProgrammes` server-side using the same join from Slice 4.

#### 5.2 Wizard client → `src/components/dashboard/judgement/JudgementWizardClient.tsx`

- Add `initialStageId?: string | null` and `hideStageFilter?: boolean` props.
- Add the in-page stage filter `<Select>` (template at `ScheduleClient.tsx:577-598`).
- When `hideStageFilter` is true, hide the dropdown and rely on the cookie-driven banner selector.
- When `accessibleStageIds.length === 1`, auto-lock to that stage.
- Filter `judgeProgrammes` / `rejudgeProgrammes` further by the selected stage client-side.

---

### Slice 6 — Tests / regression

| File | Coverage |
|---|---|
| `src/features/schedule/utils/schedule-times-validation.test.ts` (new) | Pre-festival dates pass; date after `endDate` rejects; missing festival dates; bad day-key format. |
| `src/features/schedule/actions/schedule.actions.test.ts` (extend) | `createScheduleEntry` rejects programmes already scheduled; rejects null-stage writes from STAGE_MANAGERs; rejects writes on stages not in `accessibleStageIds`. |
| `src/features/stages/services/stage-assignment.service.test.ts` (extend) | `getAccessibleStageIds` returns `"all"` for admin; `string[]` for STAGE_MANAGER; `[]` for unassigned STAGE_MANAGER. |
| `src/features/programmes/services/programme-reporting.service.test.ts` (new) | `listByFestival` honours `accessibleStageIds`; unscheduled programmes with assignments appear; `getOrCreateSessionByProgramme` is idempotent. |
| `src/features/judgement/actions/judgement.actions.test.ts` (new) | `getJudgementWizardDataAction` returns only programmes on the manager's stages; rejudge list scoped identically. |

---

## Phased Implementation Order

| # | Slice | Deliverable | Verify |
|---|---|---|---|
| 1.1 | Schema + migration | `scheduleEntryId` nullable; UNIQUE on `(festivalId, programmeId)`. | `pnpm db:reset`; `\d programme_reporting_session` |
| 1.2 | Reporting service | `listByFestival` + `getOrCreateSessionByProgramme` + `startByProgramme` + stage scoping. | Unit test: scoped list works. |
| 1.3 | Reporting action + types | `startProgrammeReportingAction(festivalId, programmeId)`; widen `ReportingBoardItem`. | TypeScript compiles. |
| 1.4 | Reporting client | Unscheduled programmes render with "Start reporting" button. | Manual: start reporting on an unscheduled programme. |
| 1.5 | Page cleanup | Drop page-level post-filter. | Server-side scoping verified. |
| 2.1 | Validation lower bound | `validateScheduleTimesForFestival` accepts pre-festival dates; rejects post-end. | Unit test. |
| 2.2 | Helper | `getScheduleDateKeyUpperBound`. | — |
| 2.3 | Programme dropdown | `getSchedulableProgrammesAction`; defence-in-depth check in `createScheduleEntry`. | Manual: drop an entry into the page-level filter; dropdown stays clean. |
| 2.4 | Day-tab auto-scroll | `scrollbar-hide` + `snap-x snap-mandatory` + `scrollIntoView`. | Manual: switch day tabs on mobile. |
| 3.1 | Schedule write guards | All five actions reject unassigned stages. | Unit test. |
| 3.2 | Read filter | Drop `isNull(stageId)` branch for STAGE_MANAGER. | Manual: STAGE_MANAGER no longer sees null-stage entries. |
| 3.3 | REST API | Same guard at `/api/v1/schedule`. | `curl` returns 403 for unassigned stage. |
| 4.1 | Judgement reads | `judgeProgrammes` + `rejudgeProgrammes` scoped via latest CLOSED session's stage. | Unit test. |
| 4.2 | Active configs | `judgementConfig` filter applied. | — |
| 4.3 | Judged cards | Same join. | — |
| 4.4 | Dashboard data | Pass `accessibleStageIds` through. | — |
| 5.1 | Judgement page | Pass `initialStageId` + `hideStageFilter`. | — |
| 5.2 | Wizard client | Stage filter dropdown; auto-lock for single-stage. | Manual: switch banners. |
| 6.1 | Tests | New / extended tests for all slices. | `pnpm test` passes. |

---

## Files Touched

**New**
- `drizzle/00XX_programme_reporting_nullable_schedule_entry.sql`
- `src/features/schedule/utils/schedule-times-validation.test.ts`
- `src/features/programmes/services/programme-reporting.service.test.ts`
- `src/features/judgement/actions/judgement.actions.test.ts`

**Modified**
- `src/core/database/schema.ts` — nullable `scheduleEntryId`, swap UNIQUE index
- `src/features/schedule/utils/schedule-times-validation.ts` — drop lower bound, new error message
- `src/features/schedule/utils/festival-schedule-days.ts` — add `getScheduleDateKeyUpperBound`
- `src/features/schedule/actions/schedule.actions.ts` — new `getSchedulableProgrammesAction`; defence-in-depth check; `getAccessibleStageIds` guard on all five write actions; drop `isNull(stageId)` branch from read filter
- `src/features/programmes/services/programme-reporting.service.ts` — new `listByFestival(session)` + `getOrCreateSessionByProgramme` + `startByProgramme`; make `unlockByScheduleEntryChange` no-op tolerant
- `src/features/programmes/actions/programme-reporting.actions.ts` — signature change `startProgrammeReportingAction`; drop `getStageIdForScheduleEntry`
- `src/features/judgement/actions/judgement.actions.ts` — `accessibleStageIds` filter on all four reads
- `src/app/dashboard/[slug]/pre-event-works/schedule/page.tsx` — wire `getSchedulableProgrammesAction`
- `src/app/dashboard/[slug]/event-works/reporting/page.tsx` — drop post-filter
- `src/app/dashboard/[slug]/event-works/judgement/page.tsx` — pass `initialStageId` + `hideStageFilter`
- `src/app/api/v1/schedule/route.ts` — same guard
- `src/components/festival/pre-event-works/schedule/ScheduleClient.tsx` — widen `getFestivalDateOptions`; day-tab auto-scroll
- `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx` — render unscheduled programmes
- `src/components/festival/event-works/programme-reporting/types.ts` — widen `ReportingBoardItem`
- `src/components/dashboard/judgement/JudgementWizardClient.tsx` — stage filter dropdown + auto-lock

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing `programmeReportingSession` rows reference `scheduleEntryId` | Migration just makes the column nullable; existing rows keep their FK reference. |
| STAGE_MANAGER with no assignments | `getAccessibleStageIds` returns `[]`; surfaces render empty. Confirmed intentional. |
| `STARTED` programmes with no closed session and no schedule entry | Surface via `programmeReportingSession.stageId` directly in the SQL join. |
| `programmeReportingSession.stageId` is `null` for unscheduled programmes | Reporting actions already tolerant of `null` stage (`assertStageManagerAccessForStage` returns actor if `stageId == null`). |
| `reorderScheduleEntries` could swap entries across stages | Guard rejects if any entry's stageId is not in `accessibleStageIds`. |
| REST `/api/v1/schedule` pagination/filtering | Existing handler is thin; guard added at top. |
| `getTimeConflictError` already restricts by stage — STAGE_MANAGER only sees the conflict on their stages | Unchanged. |
| `getScheduleEntries` returning `[]` for a STAGE_MANAGER with one stage while page shows zero entries | Expected behaviour; empty-state UI already handles it. |
| `schedule-orchestration.ts` calls `unlockByScheduleEntryChange` on every programme mutation | Make it no-op-tolerant; never throws if no session found. |
| `ReportingBoardList` and `ReportingRosterTable` props | Widening `ReportingBoardItem` cascades; manual adjust if either component accesses `scheduleEntry` fields directly. |
| Concurrent `startByProgramme` for the same programme | New UNIQUE on `(festivalId, programmeId)` makes the second `start` a no-op (or returns the existing session). |
| Timezone handling for `endKey` upper bound | Use `parseInstant(festival.endDate) → formatInTimeZone(tz, "yyyy-MM-dd")` — same pattern as `getFestivalDateKeySet`. |
| Tests assume a seed/DB fixture | Add minimal in-memory mocks for `db.query.programme.findMany` etc., or extend the existing seed script. |

---

## Acceptance Criteria

- [ ] All six slices shipped (one PR or six stacked commits — TBD).
- [ ] `pnpm db:reset` runs cleanly with the new schema; `\d programme_reporting_session` shows nullable `scheduleEntryId` and the new UNIQUE index.
- [ ] Pre-festival schedule dates are accepted; post-end dates are rejected with the new error message.
- [ ] A programme with assignments but no schedule entry can be reported against from the reporting board.
- [ ] `getProgrammeReportingBoardAction` honours `accessibleStageIds` — STAGE_MANAGERs see only their stages' programmes (including null-stage programmes).
- [ ] `createScheduleEntry` / `updateScheduleEntry` / `deleteScheduleEntry` / `reorderScheduleEntries` / `checkScheduleConflict` reject writes on stages not in the caller's `accessibleStageIds`.
- [ ] `getScheduleEntries` no longer returns null-stage entries to STAGE_MANAGERs.
- [ ] The Add-to-Schedule dropdown excludes programmes already scheduled anywhere in the festival, both via the server action and the defence-in-depth write check.
- [ ] `getJudgementWizardDataAction` returns only programmes on the manager's stages; `rejudgeProgrammes` scoped identically.
- [ ] Schedule day tabs auto-scroll the active tab into view on mobile widths.
- [ ] `/api/v1/schedule` rejects unassigned-stage writes from STAGE_MANAGERs.
- [ ] `pnpm test` passes with new + extended tests.
- [ ] Manual smoke: STAGE_MANAGER assigned to two stages sees the dropdown; assigned to one stage gets auto-lock; assigned to zero stages sees empty surfaces.
- [ ] Manual smoke: admin / owner / SUPER_ADMIN sees all programmes on all surfaces.

---

## References

- `src/features/schedule/utils/schedule-times-validation.ts:34-38` — date-mismatch error location.
- `src/features/schedule/actions/schedule.actions.ts:127-138` — existing `accessibleStageIds` read filter.
- `src/features/stages/services/stage-assignment.service.ts:60-89` — `getAccessibleStageIds` contract.
- `src/features/programmes/actions/reporting-access.ts:129-145` — `assertStageManagerAccessForStage`.
- `src/features/programmes/services/programme-reporting.service.ts:232-269` — current unscoped `listByFestival`.
- `src/features/judgement/actions/judgement.actions.ts:78-117` — current unscoped wizard data.
- `src/components/festival/dashboard/StageContextSelector.tsx` — cookie-driven banner selector.
- `src/features/stages/stage-filter-cookie.server.ts` — `getStageFilterCookie` helper.
- `src/app/dashboard/[slug]/pre-event-works/schedule/page.tsx:70-92` — pattern for `initialStageId` + `hideStageFilter`.
- `src/app/dashboard/[slug]/event-works/reporting/page.tsx:92-98` — page-level post-filter to be removed.
- `src/core/database/schema.ts:1064-1126` — `programmeReportingSession` table.
- `src/core/database/schema.ts:1936-1977` — `stageManagerAssignment` table.
- `src/core/auth/assert-festival-access.ts` — festival access guard.
- Issue #13 (Centralised Date/Time Handling) — `parseInstant`, `formatInTimeZone`, `fromZonedTime` patterns.
- Issue #14 (Unified Branded Email Layer) — colour-coordinated reporting notifications.
- Issue #15 (Festival Lifecycle + Exports) — Track A + Track B migration pattern.
