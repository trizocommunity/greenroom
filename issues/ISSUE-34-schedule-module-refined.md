# Schedule Module — Bilingual Names, Duration-Aware Scheduling, Timeline View, and Slot Swapping

## Status

- **Created**: 2026-08-03
- **Status**: Draft
- **Priority**: High
- **Complexity**: High

## Problem statement

The schedule currently provides only a day-grouped list. Programme names have one language, durations are not derived from participant or team counts, end times are manually entered, and scheduled programmes cannot swap slots. The target experience needs a duration-aware table and a stage-by-stage calendar timeline while preserving existing schedule permissions, conflict detection, exports, and lifecycle behaviour.

## What to build

Deliver the Schedule Module in three vertical slices:

1. Programme metadata and duration-aware table scheduling.
2. Stage timeline/calendar view.
3. Atomic programme slot swapping.

Each slice must include the required schema/API/UI path and automated coverage for its behaviour.

## Slice 1 — Programme metadata, duration calculation, and table view

Add bilingual programme metadata and duration configuration:

- Add `nameSecondary` (or `nameLocal`) text to `programme`.
- Add `durationMode`: `SEQUENTIAL` or `PARALLEL`, defaulting to `SEQUENTIAL`.
- Add `timePerUnitMinutes`, defaulting to 5 for individual programmes and 10 for group programmes.
- Add nullable `parallelDurationMinutes`, used only for parallel programmes.
- Create the corresponding enum and migration.
- Keep calculated duration derived rather than stored:
  - Sequential individual: `timePerUnitMinutes × assignmentCount`.
  - Sequential group: `timePerUnitMinutes × teamCount`.
  - Parallel: `parallelDurationMinutes`.

Replace or extend the schedule list with a sortable, searchable table containing competition name, secondary name, type/gender, participant count and formula breakdown, stage, date/time range, and actions. Schedule time is the default sort; stage and competition name are also supported. Search covers programme name, stage, and category.

When adding or editing an entry, calculate and populate `endTime` from the selected start time and derived programme duration. Keep end time editable for manual buffers or overrides.

### Acceptance criteria

- [ ] Programme records support secondary-language names and all duration fields with validated defaults.
- [ ] A migration applies the schema changes cleanly to an existing database.
- [ ] Derived duration is correct for sequential individual, sequential group, and parallel programmes, including invalid/missing configuration handling.
- [ ] Table view displays English name first and secondary name below it, plus a human-readable duration formula.
- [ ] Table view sorts by schedule time by default and supports stage/name sorting and cross-field search.
- [ ] Add/edit schedule entry auto-populates end time from the derived duration while allowing manual override.
- [ ] Existing add-schedule support for programme and session entries, conflict badge, export PDF, clear-all, stage-manager scoping, and read-only expired-festival behaviour remains intact.
- [ ] Unit/integration tests cover duration calculation, table data, and auto end-time behaviour.

## Slice 2 — Timeline/calendar view

Add a calendar/timeline mode alongside the table mode:

- Y-axis shows festival stages.
- X-axis shows scrollable 30-minute time slots.
- Provide a festival-day selector for available schedule days.
- Render coloured schedule blocks with programme name, category/type, and time range.
- Use category/type-based colours and show conflict badges for overlapping entries.
- Provide hover/click details with full programme, stage, participant, and schedule information.
- Preserve the existing layout toggle and stage-manager scoping. Drag-and-drop movement is a stretch goal and must not block the core timeline.

### Acceptance criteria

- [ ] Users can toggle between table and timeline/calendar modes.
- [ ] Timeline renders stages on the Y-axis and 30-minute increments on a horizontally scrollable X-axis.
- [ ] Day selection changes the displayed schedule using festival timezone rules.
- [ ] Blocks display programme name, category/type, and time range with deterministic category/type colours.
- [ ] Overlapping blocks show a visible conflict indicator consistent with existing conflict detection.
- [ ] Hover/click details expose the full schedule information without requiring table mode.
- [ ] Stage managers see and edit only their accessible stages; past/expired festivals are read-only.
- [ ] Existing PDF export, clear-all, add-schedule flow, and conflict count continue to work.
- [ ] Component and action tests cover day selection, stage/time placement, scoping, and conflict rendering.

## Slice 3 — Atomic programme slot swapping

Add the table-row swap action for programme entries only:

- Clicking the swap action opens a drawer with the selected programme's name, stage, time, participants, and category.
- Provide a searchable list of other scheduled programmes showing each target's current stage and time slot.
- Preview both programmes' new positions before confirmation.
- On confirmation, atomically exchange both entries' `startTime`, `endTime`, `stageId`, and `order` values.
- Validate conflicts for both resulting positions before committing. Reject the entire operation if either position is invalid.
- Do not allow swapping sessions or cross-scope entries.
- Enforce stage-manager permissions and read-only rules in the server-side operation, not only in the UI.

### Acceptance criteria

- [ ] Swap action is available for programme rows and unavailable for session rows.
- [ ] Drawer shows selected details and a searchable target list with current positions.
- [ ] Preview shows both resulting positions before confirmation.
- [ ] Successful swap updates both entries' stage, start/end times, and order in one transaction.
- [ ] Conflict validation evaluates both new positions together and leaves both entries unchanged on failure.
- [ ] Server-side authorization prevents stage managers from swapping entries outside their stages and prevents edits in expired/read-only festivals.
- [ ] Concurrent or invalid swaps fail safely without partial updates.
- [ ] Tests cover successful swaps, conflict rejection, session exclusion, permissions, atomic rollback, and ordering.

## Blocked by

- Slice 1 is blocked by the existing programme schema and migration conventions only; it can start immediately.
- Slice 2 is blocked by Slice 1.
- Slice 3 is blocked by Slice 1 and the existing schedule conflict/permission contracts.

## Out of scope

- Production auto-schedule generation; current seed-only auto-scheduling is retained.
- Drag-and-drop timeline editing beyond the stretch goal.
- Swapping sessions.
- Changing existing stage-manager assignment management.
- Storing calculated duration as a programme column.

## Existing behaviour to retain

- Programme and session schedule entry creation.
- Per-stage conflict detection and count badge.
- PDF export options.
- Clear all schedule entries.
- Layout toggle.
- Stage-manager scoping.
- Read-only mode for past/expired festivals.

## Implementation priority

1. Schema and migration for bilingual names and duration metadata.
2. Table view with duration display and automatic end-time calculation.
3. Timeline/calendar view.
4. Atomic programme slot swapping.
