# `createdBy` Schema Consistency

## Status
- **Created**: 2026-08-04
- **Status**: Draft
- **Priority**: High (Phase 1 — user-visible bug); Medium (Phases 2-3)
- **Complexity**: Medium
- **Blocks**: any UI that wants to show "Created by" without a join; future audit trail work; consistent creator metadata across resources.

## Summary

The codebase has three different creator-column conventions in active use:

1. `createdByName + createdByEmail` (canonical) — used by `programme`, `programme_assignment`, `programme_assignment_member`.
2. Single `createdBy: text()` with conflicting semantics — `stage`, `schedule_entry`, `festival_scoring_policy`, `judgement_config`, `festival_export`. Different writers feed the same column with different content (name string / user UUID / literal "system").
3. No creator column at all — `category`, `group`, `participant`, `judge`, `festival_member`, `festival_news`, `festival_media_image`, `festival_media_video`, `festival_poster_template`.

**Phase 1** fixes the user-visible bug (`stage.createdBy` showing a UUID in the dashboard). **Phase 2** aligns the other single-ID columns with the canonical convention. **Phase 3** adds the convention to tables that have human creators but currently lack the column.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Canonical shape | `createdByName: text()` + `createdByEmail: text()` (both nullable) |
| 2 | Phase 1 scope | `stage` only — user-facing bug |
| 3 | Phase 2 scope | `schedule_entry`, `festival_scoring_policy`, `judgement_config`, `festival_export` |
| 4 | Phase 3 scope | Add creator to `category`, `group`, `judge`, `festival_news` (human creators exist) |
| 5 | Skip | `participant` (no meaningful creator — created via bulk + team-leader), `festival_member` (FK to `user.id` already encodes creator), `festival_media_image`, `festival_media_video`, `festival_poster_template` (no creator UI today) |
| 6 | Migration direction | Rename `createdBy` → `createdByName`; add `createdByEmail` column |
| 7 | Backfill strategy | For existing rows, populate `createdByName` from `user.displayName ?? user.fullName ?? user.email` via the existing FK relation. Run as a Drizzle migration step + a separate backfill script. |
| 8 | Off-stage "system" sentinel | Migrate to `createdByName: "System"`, `createdByEmail: null` |
| 9 | `festival_export` keeps FK | Keep FK to `user.id`; ADD `createdByName` for UI |
| 10 | UI text | `Created by {name} ({email})` when email present; `Created by {name}` otherwise; `Created by System` when null |
| 11 | Phase 1 backfill | Backfill runs once in production. New rows go through the new contract. |
| 12 | Audit log retention | Existing audit_log entries (which use `targetType`/`targetId`/`actorEmail`) are NOT touched by this issue |

## Problem Statement

### User-visible bug (Phase 1)

`src/components/festival/event-works/stage-management/StagesClient.tsx:373-380` renders:

```tsx
<span className="font-medium text-foreground">
  {stage.createdBy || "System"}
</span>
```

Three writers feed the same `stage.createdBy: text()` column with conflicting content:

- `src/features/stages/actions/stage.actions.ts:31-45` — stores the user's display name string.
- `src/app/api/v1/stages/route.ts:46` — stores the raw user UUID.
- `src/features/stages/services/off-stage.service.ts:70` — stores the literal `"system"`.

Result: a stage created via the API route (the path used by the dashboard's StageDialog via `useCreateStage` which calls `/api/v1/stages`) shows a raw UUID.

### Broader audit findings (Phases 2-3)

**Single-ID columns with broken semantics:**

| Table | Schema file:line | Writers | Bug |
|---|---|---|---|
| `stage` | `src/core/database/schema.ts:693` | 3 paths with 3 different content types | User-visible UUID |
| `schedule_entry` | `src/core/database/schema.ts:835` | Action writes name, API route writes user ID; relation at `relations.ts:242-247` declares FK to user.id (unusable with name data) | Relation unusable |
| `festival_scoring_policy` | `src/core/database/schema.ts:532` | `scoring-policy.service.ts:361` writes `input.updatedBy` (user ID), no FK declared | Inconsistent |
| `judgement_config` | `src/core/database/schema.ts:1432` | Never written; stays NULL | Dead column |
| `festival_export` | `src/core/database/schema.ts:2183` | FK to user.id (correct) but single column | No name for UI |

**Missing entirely (Phase 3 — tables with human creators):**

| Table | Schema file:line | Notes |
|---|---|---|
| `category` | `src/core/database/schema.ts:395-424` | Creator is the festival owner; should record |
| `group` | `src/core/database/schema.ts:428-458` | Same |
| `judge` | `src/core/database/schema.ts:1389-1416` | Same |
| `festival_news` | `src/core/database/schema.ts:1592-1614` | Creator recorded by `news.actions.ts:50-59` and `app/api/v1/news/route.ts:70` but discarded |

**Skipped (no creator column, none planned):**

| Table | Reason |
|---|---|
| `participant` | Created via bulk + team-leader; "creator" is implicit (the festival owner) |
| `festival_member` | FK to `user.id` already encodes the creator |
| `festival_media_image` | No creator UI today |
| `festival_media_video` | No creator UI today |
| `festival_poster_template` | No creator UI today |

## Out of Scope

- Adding creator columns to tables marked "skip" in locked decisions.
- Audit log of who viewed/edited resources (separate work).
- Soft-delete columns (separate work).
- Renaming `createdBy` → `createdById` on `festival_export` (the FK is correct; just add `createdByName` alongside).
- Migrating historical audit_log entries.

## Solution

### Phase 1 — Fix `stage` (user-visible bug)

**Drizzle migration** (`drizzle/00XX_stage_creator_columns.sql`):

```sql
-- Step 1: add new columns
ALTER TABLE "stage" ADD COLUMN "created_by_name"  TEXT;
ALTER TABLE "stage" ADD COLUMN "created_by_email" TEXT;

-- Step 2: backfill from existing createdBy (UUID -> resolve via user table)
UPDATE "stage" s
SET
  "created_by_name" = COALESCE(
    (SELECT "displayName" FROM "user" u WHERE u."id" = s."createdBy"),
    (SELECT "fullName"   FROM "user" u WHERE u."id" = s."createdBy"),
    (SELECT "email"      FROM "user" u WHERE u."id" = s."createdBy")
  ),
  "created_by_email" = (SELECT "email" FROM "user" u WHERE u."id" = s."createdBy")
WHERE s."createdBy" IS NOT NULL
  AND (SELECT 1 FROM "user" u WHERE u."id" = s."createdBy") IS NOT NULL;

-- Step 3: handle the off-stage "system" sentinel literally
UPDATE "stage"
SET "created_by_name" = 'System'
WHERE "createdBy" = 'system' AND "created_by_name" IS NULL;

-- Step 4: drop the old column
ALTER TABLE "stage" DROP COLUMN "createdBy";
```

**Schema update** (`src/core/database/schema.ts:686-697`):

```ts
export const stage = pgTable(
  "stage",
  {
    // ... existing columns ...
    createdByName: text("created_by_name"),
    createdByEmail: text("created_by_email"),
  },
  // ... existing indexes/constraints ...
);
```

**Zod contract update** (`src/api/contracts/stages.ts:8`):

```ts
export const stageSchema = z.object({
  // ... existing fields ...
  createdByName: z.string().nullable().optional(),
  createdByEmail: z.string().nullable().optional(),
});
```

**API POST handler** (`src/app/api/v1/stages/route.ts:39-50`):

```ts
async POST({ user, request }) {
  // ... existing validation ...
  const actorUser = user?.userId
    ? await db.query.user.findFirst({
        where: eq(userTable.id, user.userId),
        columns: { email: true, displayName: true, fullName: true },
      })
    : null;

  const result = await db.insert(stage).values({
    // ... existing fields ...
    createdByName: actorUser?.displayName || actorUser?.fullName || actorUser?.email || null,
    createdByEmail: actorUser?.email || null,
  }).returning();
  // ...
}
```

**Off-stage provisioner** (`src/features/stages/services/off-stage.service.ts:70`):

```ts
await db.insert(stage).values({
  // ... existing fields ...
  createdByName: "System",
  createdByEmail: null,
});
```

**UI** (`src/components/festival/event-works/stage-management/StagesClient.tsx:373-380`):

```tsx
<span className="font-medium text-foreground">
  {stage.createdByName || "System"}
</span>
```

### Phase 2 — Align other single-ID columns

Same migration pattern for `schedule_entry`, `festival_scoring_policy`, `judgement_config`, `festival_export`. Each gets:

1. New `created_by_name` + `created_by_email` columns
2. Backfill from the existing single column via JOIN to `user`
3. Drop the old single column (for `schedule_entry`, `festival_scoring_policy`, `judgement_config`)
4. Keep FK on `festival_export`; just add `created_by_name` alongside (no drop)

`schedule_entry` migration also fixes the relation at `src/core/database/relations.ts:242-247` — drop the broken `createdBy: one(user, ...)` relation (the column it references no longer exists; the new columns are text, not FK).

### Phase 3 — Add creator to tables that have human creators

For `category`, `group`, `judge`, `festival_news`:

```ts
createdByName: text("created_by_name"),
createdByEmail: text("created_by_email"),
```

Add inside the existing service / action write path:

```ts
const actorUser = session?.userId ? await db.query.user.findFirst({
  where: eq(userTable.id, session.userId),
  columns: { email: true, displayName: true, fullName: true },
}) : null;

await db.insert(category).values({
  // ... existing fields ...
  createdByName: actorUser?.displayName || actorUser?.fullName || actorUser?.email || null,
  createdByEmail: actorUser?.email || null,
});
```

For `category`, `group`, `judge`: API route POST handlers also need updating (the same dual-path pattern that broke stage). Server action writers + API writers both.

For `festival_news`: news creation paths at `src/features/news/actions/news.actions.ts:50-59` and `src/app/api/v1/news/route.ts:70` both currently discard the creator — wire to the new columns.

### Phase 3 — Optional UI

For each new creator column, render in the relevant detail drawer:
- `category`: optional — not currently rendered anywhere
- `group`: optional — not currently rendered anywhere
- `judge`: rendered in `JudgesClient.tsx` if useful
- `festival_news`: rendered in news drawer

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| C.1 | Phase 1 schema | `stage.createdBy` → `createdByName` + `createdByEmail` columns | Migration runs; `\d stage` shows new columns; old column dropped |
| C.2 | Phase 1 contract | `stageSchema` exposes new fields | Typecheck |
| C.3 | Phase 1 API POST | `/api/v1/stages` writes both new fields, looks up user | Manual: create stage via UI → "Created by" shows name |
| C.4 | Phase 1 off-stage provisioner | `off-stage.service.ts` writes `"System"` | Manual: provision off-stage → "Created by: System" |
| C.5 | Phase 1 UI | `StagesClient.tsx:373-380` renders new field | Manual: existing UUID rows show name after migration |
| C.6 | Phase 1 integration test | `creator-columns.test.ts` covers stage | CI green |
| C.7 | Phase 2 schema | `schedule_entry`, `festival_scoring_policy`, `judgement_config`, `festival_export` migrated | Migrations run; backfill populates |
| C.8 | Phase 2 API/service updates | All writers for the four tables updated | Unit tests pass; no UUIDs in DB |
| C.9 | Phase 2 relation fix | `relations.ts:242-247` `createdBy` relation removed | Typecheck |
| C.10 | Phase 3 schema | `category`, `group`, `judge`, `festival_news` gain creator columns | Migrations run |
| C.11 | Phase 3 write path updates | All writers for the four tables updated | New rows have creator populated |
| C.12 | Phase 3 optional UI | Render creator in relevant drawers (optional, scope-cuttable) | Manual |

## Files Touched

**New**
- `drizzle/00XX_stage_creator_columns.sql`
- `drizzle/00XX_schedule_entry_creator_columns.sql`
- `drizzle/00XX_festival_scoring_policy_creator_columns.sql`
- `drizzle/00XX_judgement_config_creator_columns.sql`
- `drizzle/00XX_festival_export_creator_name.sql`
- `drizzle/00XX_category_group_judge_news_creator_columns.sql`
- `scripts/migrations/backfill-creator-columns.ts` (idempotent backfill for any new FK-style columns)
- `src/test/integration/creator-columns.test.ts`

**Modified (Phase 1 — stage)**
- `src/core/database/schema.ts:686-697`
- `src/api/contracts/stages.ts:8`
- `src/app/api/v1/stages/route.ts:39-50`
- `src/features/stages/services/off-stage.service.ts:70`
- `src/components/festival/event-works/stage-management/StagesClient.tsx:373-380`

**Modified (Phase 2 — other single-ID columns)**
- `src/core/database/schema.ts:532, 835, 1432, 2183`
- `src/core/database/relations.ts:242-247` (drop broken relation)
- `src/features/schedule/actions/schedule.actions.ts:452-470`
- `src/app/api/v1/schedule/route.ts:120`
- `src/features/judgement/services/scoring-policy.service.ts:361`
- `src/features/judgement/actions/judgement.actions.ts:898-910` (start populating `createdByName`)
- `src/features/exports/repositories/export.repository.ts:42`

**Modified (Phase 3 — missing tables)**
- `src/core/database/schema.ts:395-424, 428-458, 1389-1416, 1592-1614`
- `src/features/categories/actions/category.actions.ts`
- `src/features/categories/services/category.service.ts`
- `src/app/api/v1/categories/route.ts:17`
- `src/features/groups/actions/group.actions.ts`
- `src/features/groups/services/group.service.ts`
- `src/app/api/v1/groups/route.ts:17`
- `src/features/judges/actions/judge.actions.ts`
- `src/app/api/v1/judges/route.ts:26`
- `src/features/news/actions/news.actions.ts:50-59`
- `src/app/api/v1/news/route.ts:70`

## Verification

- Migration runs cleanly on dev DB; backfill populates all existing rows
- Existing stages created via the API route now show their creator's name in the UI (manual + integration test)
- Off-stage provisioned stages show "Created by: System"
- TypeScript: `pnpm typecheck` passes (no consumer still references the old `createdBy` column)
- Existing unit tests pass
- New integration tests at `creator-columns.test.ts` pass
- For Phase 2/3: same pattern — migration + backfill + writer updates + tests

## Out-of-Scope Notes

- The off-stage "system" sentinel is a literal string, not a special column. This is acceptable because (a) only one writer uses it and (b) it never needs to be resolved to a user. If we ever need to track who triggered the off-stage provision, we can revisit.
- The `festival_export.createdBy` FK to `user.id` is the only "correct" single-ID pattern in the codebase. We preserve it and add a `createdByName` column alongside rather than replacing it.
- Audit log entries (`audit_log` table) use a different convention (`actorEmail`) and are out of scope.
