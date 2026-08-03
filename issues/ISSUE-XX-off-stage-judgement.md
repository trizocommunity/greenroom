# ISSUE-XX: Off-Stage Judgement for Unscheduled Programmes

## Problem

Migration `0032_programme_reporting_nullable_schedule_entry.sql` opened up the
reporting flow for programmes that have participant assignments but no
`schedule_entry` — i.e. **unscheduled programmes**. Reporting, marking, and
closing reporting sessions all work for these programmes today.

Judgement, however, still throws:

> `This programme isn't linked to a stage; the judge portal requires a stage assignment.`

at `src/features/judgement/actions/judgement.actions.ts:893-897` (start)
and `:975-979` (restart). The judge portal is fundamentally cookie-pinned
to a single `stageId` via `assertStagePortalAccessForConfig` — every portal
write requires a non-null `stageId` on the reporting session. Unscheduled
programmes never get one because they have no `schedule_entry`, so the
judgement flow is gated against them.

## Solution: Virtual "Off-Stage" Stage per Festival

Each festival gets one synthetic stage named **Off-Stage**. It looks like a
real stage — has its own portal access code and PIN, can be renamed, can be
viewed in the stage grid — but is flagged `isOffStage = true` and cannot be
deleted. Its sole purpose is to act as the stage target when judgement is
started for an unscheduled programme.

When `startJudgementAction` (or `restartJudgementAction`) is invoked on a
programme whose reporting session has `stageId = null`, the action now:

1. Looks up the festival's Off-Stage stage.
2. Sets `programme_reporting_session.stageId` to the Off-Stage id inside the
   same transaction as the judgement-config insert.
3. Proceeds as if the programme were scheduled on that stage.

Judges log in to the portal with the Off-Stage credential. The portal UI
labels the header "Off-Stage" instead of the stage name. Scoring is identical
to a physical stage.

## Schema Changes

Migration `0034_stage_off_stage.sql`:

```sql
ALTER TABLE "stage" ADD COLUMN "is_off_stage" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "stage_festivalId_isOffStage_key"
  ON "stage" ("festivalId")
  WHERE "is_off_stage" = true;
```

Backfill: every existing festival receives one Off-Stage stage plus a
placeholder portal credential. Admins should rotate the credential from the
stage grid on first use.

The Drizzle schema (`src/core/database/schema.ts`) gains:

```ts
isOffStage: boolean("is_off_stage").default(false).notNull(),
```

with the matching partial unique index.

## Behaviour Changes

### Auto-provisioning

`createFestival` and `relaunchFestival` in
`src/features/festivals/actions/festival-crud.actions.ts` call
`ensureOffStageStage(festivalId)` after the festival row is committed.
`ensureOffStageStage` is idempotent (returns the existing row, or inserts
a new one + portal credential inside one transaction).

### Judgement flow

`src/features/judgement/actions/judgement.actions.ts`:

- New helper `resolveStageIdForJudgement(festivalId, currentStageId)`:
  - If `currentStageId` is set, returns it unchanged.
  - Else looks up the Off-Stage stage for the festival. Throws a friendly
    error if none is provisioned.
- `insertLiveJudgementConfig` accepts the resolved stageId and the prior
  reporting-session stageId. If they differ, the same transaction that
  inserts the `judgement_config` also UPDATEs
  `programme_reporting_session.stageId`.
- `startJudgementAction` and `restartJudgementAction` call the helper and
  emit a `JUDGEMENT_AUTO_ASSIGN_OFF_STAGE` audit log entry whenever an
  auto-assign happens.

### Stage delete guard

`deleteStage` in `src/features/stages/actions/stage.actions.ts` and the
matching `DELETE` handler in `src/app/api/v1/stages/[id]/route.ts` refuse
to delete a row with `isOffStage = true`. Renames are still permitted.

### UI

- `src/components/festival/event-works/stage-management/StagesClient.tsx`
  shows a "Virtual" badge next to the Off-Stage name and hides the Delete
  menu item for off-stage rows.
- `src/components/dashboard/judgement/JudgementWizardClient.tsx` shows an
  amber "Off-Stage" badge on programme cards whose reporting session has
  `stageId = null`, with a tooltip on the Start button explaining that the
  programme will be judged through the Off-Stage portal.
- `src/components/judge/StagePortalHomeClient.tsx` renders the page header
  as "Off-Stage" when `stage.isOffStage === true`, with a one-line helper
  text.
- `src/core/auth/stage-portal-session.ts` now returns `isOffStage` on the
  stage relation so the portal page can branch on it.

### Audit log

A new action code `JUDGEMENT_AUTO_ASSIGN_OFF_STAGE` is registered in
`src/features/auth/services/audit-log.service.ts`. Each auto-assign emits
one entry with `targetType = "REPORTING_SESSION"`, `targetId = sessionId`,
and `metadata = { festivalId, programmeId, offStageStageId, configId, restarted? }`.

## Manual assignment of stage managers

Unlike scheduled stages, the Off-Stage stage is **not** auto-assigned to
existing or newly invited stage managers. Admins assign stage managers to
the Off-Stage stage through the existing `Manage managers` UI on the stage
grid. This mirrors how every other stage in the festival works and keeps
the assignment model consistent.

## Provisioning Off-Stage for Ongoing Festivals

For festivals created before this issue shipped, two paths ensure they get
a working Off-Stage stage:

1. **Migration `0034_stage_off_stage.sql` (automatic)** — runs when the
   migration is applied. Inserts an Off-Stage stage row for every
   festival in the database. **It does not insert a portal credential**
   — the credential is provisioned on demand by the service layer so the
   access code + PIN can be displayed to the admin rather than buried in
   a SQL migration.

2. **"Provision Off-Stage" button on the stage grid (per-festival)** —
   shown as an amber banner at the top of the stage grid when an admin
   (owner / admin / super-admin) opens the page for a festival that has
   no Off-Stage stage. One click calls `provisionOffStageAction`, which
   delegates to `ensureOffStageStage`. The latter finds the existing
   stage row (created by the migration backfill) and provisions a fresh
   portal credential. The banner disappears once the stage is fully
   provisioned.

For new festivals, `createFestival` and `relaunchFestival` call
`ensureOffStageStage` immediately after the festival row commits, so the
stage + credential are available the moment the festival exists.

| Case | Behaviour |
|---|---|
| Concurrent `ensureOffStageStage` calls | The partial unique index on `(festivalId) WHERE is_off_stage = true` makes the second insert fail. The first caller's row wins. |
| Off-Stage deleted via direct SQL | FK cascade deletes its `stage_portal_credential`, `stage_portal_session`, and any `stage_manager_assignment` rows pointing at it. Future `ensureOffStageStage` will recreate it on the next access. |
| Off-Stage deleted via UI | Blocked — the action returns `AppError("The Off-Stage stage cannot be deleted.")`. |
| Two unscheduled programmes judgement started simultaneously | The "one LIVE config per stage" invariant in `insertLiveJudgementConfig` archives the first programme's config and creates the second's. Both are routed through the same Off-Stage stage, so the portal can only score one at a time — same as a physical stage. |
| Migrating an existing unscheduled programme that already has `JUDGED`/`PUBLISHED` status | No change. Judgement history is unaffected; the auto-assign path only runs at start/restart time. |

## Files Touched

| Layer | File |
|---|---|
| Migration | `drizzle/0034_stage_off_stage.sql` (new) |
| Schema | `src/core/database/schema.ts` |
| Service | `src/features/stages/services/off-stage.service.ts` (new) |
| Service test | `src/features/stages/services/off-stage.service.test.ts` (new) |
| Stage actions | `src/features/stages/actions/off-stage.actions.ts` (new — `provisionOffStageAction`) |
| Stage actions | `src/features/stages/actions/stage.actions.ts` |
| Stage action tests | `src/features/stages/actions/stage.actions.test.ts` (new), `src/features/stages/actions/off-stage.actions.test.ts` (new) |
| API route | `src/app/api/v1/stages/[id]/route.ts` |
| API client | `src/api/client/server-actions.ts` (`useProvisionOffStage`) |
| API client index | `src/api/client/index.ts` |
| Judgement actions | `src/features/judgement/actions/judgement.actions.ts` |
| Judgement test | `src/features/judgement/actions/judgement.off-stage.test.ts` (new) |
| Audit log | `src/features/auth/services/audit-log.service.ts` |
| Auth | `src/core/auth/stage-portal-session.ts` |
| UI — grid | `src/components/festival/event-works/stage-management/StagesClient.tsx` |
| UI — wizard | `src/components/dashboard/judgement/JudgementWizardClient.tsx` |
| UI — portal | `src/components/judge/StagePortalHomeClient.tsx` |

## Out of Scope

- Per-judge identity on the portal.
- BASIC-tier mark-entry path writing to `judgement_config`.
- Multi-stage "off-stage" queues (one Off-Stage per festival is the queue).
- A "select a stage" UI prompt — auto-assign is automatic and unconditional.
