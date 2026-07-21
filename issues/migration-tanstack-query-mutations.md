# Frontend Layer Migration: Simplify Mutation Handling

## Status

**Proposed** — Not started

## Motivation

### Root Cause: Cache-Sync Bug

`_mutation-factory.ts` only operates on **list caches** (`TItem[]`). Its `getQueryKey` interface accepts one key — the `all` or `list` query key. It has **no code path** for `detail(id)` caches.

Any entity that has both a list view and a detail view will show **stale data on the detail page** after a create/update/delete, because only the list key gets patched. The detail cache is orphaned.

**Affected entities (have both `all` + `detail` in `_query-keys.ts`):**
- `festivals` — `queryKeys.festivals.detail(id)`
- `students` — `queryKeys.students.detail(festivalId, studentId)`
- `programmes` — `queryKeys.programmes.detail(festivalId, programmeId)`

### Secondary Problem: Indirection

The factory abstraction hides mutation logic from the entity file. When a developer reads `students.ts`, they cannot see which query keys are invalidated — that logic lives in `_mutation-factory.ts`. This makes the cache model opaque and mutations hard to audit or modify.

---

## Scope

All mutation hooks in `src/api/client/` (23 entity + utility files).

---

## Current State

### Files Using `_mutation-factory.ts`

| File | Hooks | Has Detail View? | onMutate (optimistic)? |
|-------|-------|-----------------|------------------------|
| `students.ts` | `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent` | **Yes** | Yes |
| `categories.ts` | `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` | No | Yes |
| `judges.ts` | `useCreateJudge`, `useUpdateJudge`, `useDeleteJudge` | No | Yes |
| `stages.ts` | `useCreateStage`, `useUpdateStage`, `useDeleteStage` | No | Yes |
| `programmes.ts` | `useCreateProgramme`, `useUpdateProgramme`, `useDeleteProgramme` | **Yes** | Yes |
| `schedule.ts` | `useCreateScheduleItem`, `useUpdateScheduleItem`, `useDeleteScheduleItem` | No | Yes |
| `results.ts` | `useSaveResult` | No | Yes |

### Files With Inline Mutations

| File | Hooks | Bug? | onMutate (optimistic)? |
|------|-------|------|------------------------|
| `festivals.ts` | `useCreateFestival`, `useUpdateFestival`, `useDeleteFestival` | **YES** — only invalidates `all`, not `detail(id)` | Yes |
| `groups.ts` | `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup` | None (list-only) | Yes |
| `assignments.ts` | `useCreateAssignment`, `useUpdateAssignment`, `useDeleteAssignment` | None (list-only) | Yes |
| `members.ts` | `useAddMember`, `useRemoveMember` | None (list-only) | Yes |
| `results.ts` | `usePublishResults`, `useUnpublishResults` | None | Yes |
| `notifications.ts` | `useMarkNotificationRead`, `useMarkAllNotificationsRead` | None | Yes |
| `gallery.ts` | `useCreateGalleryItem`, `useDeleteGalleryItem` | None (list-only) | Yes |
| `news.ts` | `useCreateNews`, `useUpdateNews`, `useDeleteNews` | None (list-only) | Yes |
| `profile.ts` | `useUpdateProfile`, `useUpdateInstitution` | None | Yes |

### Files With No Optimistic Updates

| File | Notes |
|------|-------|
| `payments.ts` | Mutations without `onMutate` |
| `billing.ts` | Query only |
| `my-festival.ts` | Query only |
| `team-leader.ts` | Mutations without `onMutate` |
| `admin.ts` | Query only |
| `upload.ts` | Mutations without `onMutate` |
| `auth.ts` | `useLogout` — no `onMutate` |
| `server-actions.ts` | All use `onSuccess` + `invalidateQueries` only — no `onMutate` anywhere |

---

## Proposed Changes

### 1. Delete `_mutation-factory.ts`

Remove `createCreateMutation`, `createUpdateMutation`, `createDeleteMutation`.

### 2. Create `src/lib/query-utils.ts`

Three-tier stale time constants:

```typescript
export const STALE_TIME = {
  realtime: 10_000,   // notifications, schedule (refetch frequently)
  standard: 60_000,   // most entities
  stable: 300_000,    // profile, settings, payments
} as const;
```

### 3. Rewrite Each Entity's Mutation Hooks Inline

Default pattern — **invalidate only, no manual `setQueryData`**:

```typescript
// CREATE — invalidate the list
export function useCreateFestival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFestivalInput) => api.post('/festivals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.festivals.all }),
  });
}

// UPDATE — invalidate both list AND detail
export function useUpdateFestival(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFestivalInput) => api.patch(`/festivals/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.festivals.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}

// DELETE — invalidate both list AND detail
export function useDeleteFestival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/festivals/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.festivals.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}
```

### 4. Always Sync Both `detail(id)` and `all` Keys

Check `_query-keys.ts` before writing any hook. Entities with both `all` and `detail`:

| Entity | List Key | Detail Key |
|--------|----------|------------|
| `festivals` | `queryKeys.festivals.all` | `queryKeys.festivals.detail(id)` |
| `students` | `queryKeys.students.all(festivalId)` | `queryKeys.students.detail(festivalId, studentId)` |
| `programmes` | `queryKeys.programmes.all(festivalId, categoryId?)` | `queryKeys.programmes.detail(festivalId, programmeId)` |

For these three, **both keys must be invalidated** after any mutation.

### 5. Keep Unchanged

- `src/api/client/_query-keys.ts` — typed query key factory
- `src/api/contracts/` — Zod schemas
- `src/lib/api-client.ts` — axios HTTP client
- `src/components/providers/QueryProvider.tsx` — QueryClient context
- `src/features/` — Zustand stores (client-only state)

### 6. On Optimistic Updates

**Default: no optimistic updates.**

Only add `onMutate` + manual `setQueryData` for entities that genuinely need zero-latency feedback (e.g. drag-reorder, toggles). When needed, write it inline so the invalidated key and the patched key are visible in the same function.

**All 7 factory entities + 8 inline optimistic entities will lose optimistic updates.** Accept this tradeoff for simplicity and correctness.

---

## Migration Order

1. **Create `src/lib/query-utils.ts`** — define `STALE_TIME` constants
2. **Migrate `festivals.ts`** first — verify the cache-sync fix before scaling
3. **Migrate `students.ts` and `programmes.ts`** — these have the same detail-view bug
4. **Migrate remaining factory entities**: categories, judges, stages, schedule, results
5. **Migrate inline optimistic entities**: groups, assignments, members, notifications, gallery, news, profile
6. **Delete `_mutation-factory.ts`**

---

## Acceptance Criteria

- [ ] Update/delete reflect immediately on both list AND detail views for every entity that has a detail view
- [ ] No entity's mutation hook imports from `_mutation-factory.ts`
- [ ] All `staleTime` numeric values replaced with `STALE_TIME.*` constants
- [ ] `_mutation-factory.ts` deleted
- [ ] `server-actions.ts` — no changes needed (already uses invalidate-only pattern)
- [ ] No behavior regressions on entities that had load-bearing optimistic updates (document any UX regressions found in QA)

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UX regression from lost optimistic updates | High | Audit which entities truly need zero-latency; re-add `onMutate` inline only for those |
| Regression in detail-view bug after migration | Low | `invalidateQueries` refetches both keys automatically — no manual sync needed |
| Accidentally deleting a mutation hook | Low | Migrate one file at a time, test each before moving on |

---

## StaleTime Replacement Map

| Current Value | Constant |
|---------------|----------|
| `10 * 1000` | `STALE_TIME.realtime` |
| `30 * 1000` | `STALE_TIME.standard` |
| `60 * 1000` | `STALE_TIME.standard` |
| `2 * 60 * 1000` | `STALE_TIME.stable` |
| `5 * 60 * 1000` | `STALE_TIME.stable` |

Files affected: `festivals.ts`, `students.ts`, `programmes.ts`, `groups.ts`, `categories.ts`, `assignments.ts`, `judges.ts`, `members.ts`, `stages.ts`, `schedule.ts`, `results.ts`, `notifications.ts`, `payments.ts`, `billing.ts`, `gallery.ts`, `news.ts`, `profile.ts`, `my-festival.ts`, `team-leader.ts`, `admin.ts`, `server-actions.ts`.

---

## QA Plan

### Manual Test Matrix

For **each migrated entity**, perform these checks:

| Action | List View Expected | Detail View Expected |
|--------|-------------------|----------------------|
| Create | Appears in list after ~300ms | N/A (or appears in detail if applicable) |
| Update | Reflects change in list after ~300ms | Reflects change in detail after ~300ms |
| Delete | Disappears from list after ~300ms | Cache evicted, detail page refetches |

### Entities Requiring Dual-View Testing

- `festivals` — list (`/festivals`) + detail (`/festivals/[id]`)
- `students` — list (within festival) + detail (student profile)
- `programmes` — list (within festival) + detail (programme page)

### Regression Check

Watch for perceived latency (~100–300ms extra) after mutations on entities that previously had optimistic updates:
- All entities with `onMutate` — especially `students`, `programmes`, `notifications`, `schedule`

---

## File Inventory

```
src/
├── api/client/                          # TanStack Query hooks — IN SCOPE
│   ├── _mutation-factory.ts            # TO BE DELETED
│   ├── _query-keys.ts                  # KEEP
│   ├── _query-client.ts                # KEEP (server-side)
│   ├── auth.ts                         # MIGRATE (useLogout — no onMutate)
│   ├── admin.ts                        # MIGRATE (staleTime only)
│   ├── assignments.ts                  # MIGRATE
│   ├── billing.ts                      # MIGRATE (staleTime only)
│   ├── categories.ts                  # MIGRATE (factory → inline)
│   ├── festivals.ts                   # MIGRATE FIRST (bug fix)
│   ├── gallery.ts                     # MIGRATE
│   ├── groups.ts                      # MIGRATE
│   ├── judges.ts                       # MIGRATE (factory → inline)
│   ├── members.ts                     # MIGRATE
│   ├── my-festival.ts                  # MIGRATE (staleTime only)
│   ├── news.ts                        # MIGRATE
│   ├── notifications.ts               # MIGRATE
│   ├── payments.ts                    # MIGRATE (staleTime only)
│   ├── profile.ts                     # MIGRATE
│   ├── programmes.ts                  # MIGRATE (factory → inline, bug fix)
│   ├── results.ts                     # MIGRATE (factory → inline)
│   ├── schedule.ts                    # MIGRATE (factory → inline)
│   ├── server-actions.ts              # KEEP (already correct — invalidate only)
│   ├── stages.ts                      # MIGRATE (factory → inline)
│   ├── students.ts                    # MIGRATE (factory → inline, bug fix)
│   ├── team-leader.ts                 # MIGRATE (staleTime only)
│   └── upload.ts                       # MIGRATE (staleTime only)
├── lib/
│   ├── api-client.ts                   # KEEP
│   └── query-utils.ts                  # NEW — STALE_TIME constants
├── components/providers/
│   └── QueryProvider.tsx               # KEEP
├── api/contracts/                      # KEEP
└── features/                          # KEEP (Zustand — out of scope)
```
