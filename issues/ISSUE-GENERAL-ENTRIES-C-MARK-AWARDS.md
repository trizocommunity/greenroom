# General Entries (C Mark Awards) — Admin Manual Points for Team Standings

## Status
- **Created**: 2026-08-06
- **Status**: Approved (grill-me session confirmed)
- **Priority**: Medium
- **Complexity**: Medium
- **Blocks**: any future team-standings work that assumes "points only come from programme results"
- **Internal dependency**: none

---

## Summary

Add an admin-only "General Entries" feature for awarding manual points to groups — the **C mark** the academy gives a group based on overall performance (decorum, discipline, conduct, spirit, etc.), *not* points from any specific programme result. Admins create entries in a new dashboard page; admins publish the standings snapshot from the existing Results Console, which now combines programme results **and** published general entries into the public team-standings board.

---

## Problem Statement

1. Today `festival.teamStandings` only sums points from `result` rows tied to `programme_assignment` (`features/announcement/services/announcer.service.ts:computeStandings`). There is no way for an academy to manually award additional points to groups for non-programme considerations (overall discipline, conduct, etc.).
2. The existing `category` table mixes two concepts: (a) programme buckets (Junior/Senior) and (b) classification labels. Reusing it here would conflate them.
3. The Results Console standings preview only has two scopes (`published | all`); admins need a third way to see just the manual awards.
4. There is no admin-only path to introduce an ad-hoc item at any point in the festival, especially the last day when academies typically hand out these awards.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Who does a General Entry award points to? | One row per group, per item. Form lists all groups, point input per group. |
| 2 | When you open an entry's drawer, what's in it? | Per-row drawer with the entry's edit form + Publish/Unpublish toggle. |
| 3 | How does the new filter integrate with the existing `Published | All` filter in the Results Console standings view? | Replace the existing dropdown with three options: `Published Programme Results`, `All Programme Results`, `General Entries`. |
| 4 | When an admin clicks `Publish Points` on the Results Console, what's pushed to the public standings? | Always combined: published programme results + all published general entries, summed per group. The dropdown filters the preview only, not what is published. |
| 5 | What happens to public standings when an admin publishes a single general entry? | Manual republish only — flipping the entry's publish flag does NOT auto-rewrite `festival.teamStandings`. Admin clicks `Publish Points` from the Results Console to push combined standings to the public site. |
| 6 | How do we model the `category` field? | New `general_entry_category` lookup table (festival-scoped). The select is populated from this table; a `Create new` button inline-adds a row. |
| 7 | Can a published entry be edited or deleted? | Locked once published. Admin must Unpublish first, then edit/delete, then re-publish. |
| 8 | Where should the new page live and who can access it? | New page at `/dashboard/[slug]/event-works/general-entries`. ADMIN + OWNER + SUPER_ADMIN only. |
| 9 | The create form on the new page — how does it work? | One item, per-group points. Form has Item name + Category + N point inputs (one per group). Submitting creates one `general_entry` + N `general_entry_award` rows. |
| 10 | Where do edit and delete actions live? | Dropdown menu on the row. Drawer (opened by row click) holds Publish/Unpublish only. |

---

## Out of Scope

- No new public-facing page; points only surface through the existing team-standings snapshot.
- No tier gating (admin feature for all tiers).
- No bulk operations on general entries.
- No point breakdown on the public standings board (still a simple ranked list).
- No automatic re-publish on entry changes (manual `Publish Points` remains the path to the public site).
- No edit/delete in the drawer (delete + edit live in the row dropdown; publish in the drawer).

---

## Solution

### 1. Schema — Drizzle migration `0045_general_entries.sql`

Two new tables, normalized:

```ts
// Per-festival lookup for category labels (e.g. "Discipline", "Conduct").
general_entry_category {
  id text pk
  festival_id text fk -> festival.id (cascade)
  name text not null
  created_at timestamp(3) with time zone default now() not null
  updated_at timestamp(3) with time zone default now() not null
  created_by_name text
  created_by_email text
  unique (festival_id, name)
}

// One row per submitted item (shared name + category).
general_entry {
  id text pk
  festival_id text fk -> festival.id (cascade)
  name text not null
  category_id text fk -> general_entry_category.id (set null on delete)
  created_at timestamp(3) with time zone default now() not null
  updated_at timestamp(3) with time zone default now() not null
  created_by_name text
  created_by_email text
}

// One row per (item, group) — what gets listed, edited, published.
general_entry_award {
  id text pk
  general_entry_id text fk -> general_entry.id (cascade)
  group_id text fk -> "group".id (cascade)
  points integer not null
  is_published boolean default false not null
  published_at timestamp(3) with time zone
  published_by_name text
  published_by_email text
  created_at timestamp(3) with time zone default now() not null
  updated_at timestamp(3) with time zone default now() not null
  unique (general_entry_id, group_id)
}
```

Indexes:
- `general_entry_category (festival_id)` — for the creatable-select lookup
- `general_entry (festival_id, created_at desc)` — list default sort
- `general_entry_award (festival_id)` — list default filter
- `general_entry_award (group_id, is_published)` — standings join
- `general_entry_award (general_entry_id)` — cascade target for table scans

### 2. New feature folder `src/features/general-entries/`

```
features/general-entries/
├── actions/
│   └── general-entries.actions.ts    # server actions
├── repositories/
│   └── general-entries.repository.ts
├── services/
│   ├── general-entries.service.ts    # read helpers, validators
│   └── general-entries.standings.ts # computeGeneralEntryStandings
└── schemas/
    └── general-entries.schema.ts     # zod input shapes
```

### 3. Server actions (`features/general-entries/actions/general-entries.actions.ts`)

All use `assertFestivalAccess(session, festivalId, { requireWritable: true })`, call `createAuditLog` with the appropriate `action`, and `revalidatePath` the affected routes (`/dashboard/[slug]/event-works/general-entries`, `/dashboard/[slug]/event-works/results`, `/[slug]/results`).

```ts
createGeneralEntry(input: {
  festivalId, name, categoryId | null,
  awards: Array<{ groupId, points }>,    // only non-empty points
})                                                // also: createGeneralEntryCategory for inline select

updateGeneralEntry(input: {
  id, name, categoryId | null,
  awards: Array<{ groupId, points }>,
})                                                // 4xx if any award is_published=true

deleteGeneralEntry(id: string)                    // 4xx if any award is_published=true

publishGeneralEntryAward(id: string)              // flips is_published=true, stamps published_at/by
unpublishGeneralEntryAward(id: string)            // flips is_published=false, clears stamps
```

`revalidatePath` also runs `revalidatePath('/[slug]/results')` so the public team-standings card refreshes once `publishStandings` is run from the Results Console.

### 4. Standings recompute (`features/announcement/services/announcer.service.ts`)

- Add `computeGeneralEntryStandings(festivalId)` summing published `general_entry_award.points` per group name.
- Extend `computeStandings` signature:
  ```ts
  scope: "published" | "all" | "general"   // general = only published general entries contribute
  ```
- `publishStandings` now:
  1. computes programme-result standings (existing logic, `scope="published"`)
  2. computes general-entry standings (`computeGeneralEntryStandings`)
  3. merges per group name (sum), preserving the existing `rank` rewrite
  4. writes `festival.teamStandings` as the combined snapshot

Callers of `computeStandings` (`fetchStandingsAction`, `ResultsConsoleClient`) get the union type; only `ResultsConsoleClient` opts into `"general"`.

### 5. New page `/dashboard/[slug]/event-works/general-entries`

`src/app/dashboard/[slug]/event-works/general-entries/page.tsx`:
- Server component: `getFestivalContext({ requireWritable: true })`; redirect to `notFound()` if role is not in `{ADMIN, OWNER, SUPER_ADMIN}`.
- Loads `generalEntryCategories` + `groups` + `generalEntryAwards` (joined with `generalEntry` and `generalEntryCategory`).
- Passes the data to `GeneralEntriesClient`.

`src/components/dashboard/general-entries/GeneralEntriesClient.tsx`:
- Top: form (Item name, Category creatable-select, grid of per-group point inputs). Submit triggers `createGeneralEntry`.
- Below: table (`Item`, `Category`, `Group`, `Points`, `Status`, actions).
- Row dropdown: `Edit`, `Delete` (per-row, hover-revealed).
- Row click opens `GeneralEntryDrawer` for that row.
- Empty state when no awards exist.

`src/components/dashboard/general-entries/GeneralEntryDrawer.tsx`:
- Read view of the row contents.
- Edit form (only when `is_published === false`).
- Publish / Unpublish toggle (one button, label flips based on state).
- Disabled actions when festival is read-only (`useFestivalReadOnly`).

`src/components/dashboard/general-entries/CategoryCreateDialog.tsx`:
- Modal triggered from the creatable select to add a `general_entry_category` row.

Locked-once-published rule lives in `services/general-entries.service.ts` (`assertNotPublished(awards)` helper) and is invoked from `updateGeneralEntry`, `deleteGeneralEntry`, and from the `GeneralEntryDrawer` edit form (button disabled, with tooltip explaining).

### 6. Modify Results Console (`src/components/dashboard/announcement/ResultsConsoleClient.tsx`)

Replace `standingsScope: "published" | "all"` with `standingsScope: "published-programme" | "all-programme" | "general"`:
- `published-programme` → calls `computeStandings(festivalId, "published")` (existing path)
- `all-programme` → calls `computeStandings(festivalId, "all")` (existing path)
- `general` → calls `computeGeneralEntryStandings(festivalId)`

`Publish Points` always calls `publishStandings` (which already merges programme + general by Decision #4). Filter is preview-only.

### 7. Sidebar (`src/config/sidebar.config.ts`, around lines 220–255)

Add to the `Event Works` group:
```ts
{
  title: "General Entries",
  href: `${basePath}/event-works/general-entries`,
  icon: Award,                       // lucide-react
  allowedRoles: ["ADMIN", "OWNER"] as FestivalRole[],
}
```
No additional feature-tag gating (admin feature across all tiers).

### 8. Tests

`features/general-entries/services/general-entries.service.test.ts`:
- `createGeneralEntry`: rejects when no groups present, honours `0` explicitly vs blank.
- `updateGeneralEntry` / `deleteGeneralEntry`: throws when any award is published.

`features/announcement/services/general-entries.standings.test.ts`:
- Sums per group, ignores draft rows.
- `computeStandings("general")` returns only published general entries.
- `publishStandings` (existing test, extended): merges programme + general points.

---

## Files to Create / Modify

### Create
- `drizzle/0045_general_entries.sql`
- `src/features/general-entries/actions/general-entries.actions.ts`
- `src/features/general-entries/repositories/general-entries.repository.ts`
- `src/features/general-entries/services/general-entries.service.ts`
- `src/features/general-entries/services/general-entries.standings.ts`
- `src/features/general-entries/schemas/general-entries.schema.ts`
- `src/features/general-entries/services/general-entries.service.test.ts`
- `src/features/announcement/services/general-entries.standings.test.ts`
- `src/app/dashboard/[slug]/event-works/general-entries/page.tsx`
- `src/components/dashboard/general-entries/GeneralEntriesClient.tsx`
- `src/components/dashboard/general-entries/GeneralEntryDrawer.tsx`
- `src/components/dashboard/general-entries/CategoryCreateDialog.tsx`
- `src/features/general-entries/__tests__/general-entries.actions.test.ts`

### Modify
- `src/core/database/schema.ts` — add three new pgTable exports + relations
- `src/core/database/relations.ts` — wire relations (category, item, awards → festival + group)
- `src/features/announcement/services/announcer.service.ts` — `computeStandings` union type, `publishStandings` merge
- `src/features/announcement/actions/announcer.actions.ts` — `publishStandings` calls merged helper
- `src/features/announcement/services/announcer.service.ts` — `computeGeneralEntryStandings` export (or import from `general-entries.standings.ts`)
- `src/components/dashboard/announcement/ResultsConsoleClient.tsx` — three-option dropdown
- `src/app/dashboard/[slug]/event-works/results/page.tsx` — pass `null` for default scope (preview)
- `src/config/sidebar.config.ts` — new sidebar entry
- `src/app/dashboard/[slug]/layout.tsx` — revalidation paths catch-all is fine; no change needed

---

## Acceptance Criteria

- [ ] Migration `0045_general_entries.sql` applied; three tables exist with expected indexes and FKs.
- [ ] `/dashboard/[slug]/event-works/general-entries` is reachable for ADMIN/OWNER/SUPER_ADMIN and returns `notFound()` for others.
- [ ] Sidebar entry "General Entries" appears for ADMIN/OWNER roles.
- [ ] Form: one item, per-group point inputs — submitting with blanks skips groups; explicit `0` creates a draft row.
- [ ] Row dropdown: Edit opens the drawer with the edit form (draft only); Delete disabled on published rows.
- [ ] Drawer: Publish/Unpublish toggle flips `is_published`, stamps `published_at/by` (or clears them), and re-validates the page.
- [ ] Results Console standings dropdown has three options; `General Entries` shows only general-entry points.
- [ ] `Publish Points` writes a combined `festival.teamStandings` snapshot summing programme-result points + published general-entry points.
- [ ] Public `/[slug]/results` team-standings reflects the combined snapshot after a `Publish Points` action.
- [ ] All `assertFestivalAccess` checks reject expired and unauthorized writers (`isReadOnly` honoured in the UI).
- [ ] Audit log entries written for CREATE/UPDATE/DELETE/PUBLISH/UNPUBLISH.
- [ ] Tests cover: locked-once-published guards, `computeGeneralEntryStandings`, combined `publishStandings`.
