# tRPC → Next.js Route Handlers Migration

**Date:** 2026-07-13
**Status:** In Progress

## Overview

Migrate from tRPC to Next.js Route Handlers + React Query. Remove tRPC entirely, keep React Query for caching, optimistic updates, background refetching, and retries.

### Stack Decisions

| Decision | Choice |
|----------|--------|
| Type Safety | Shared Zod schemas in `src/api/contracts/` (manual sync) |
| API URL Structure | `/api/v1/[domain]` |
| Response Envelope | `ApiResponse<T>` — `{ success: true, data: T } \| { success: false, error: { code, message } }` |
| Auth Middleware | `createHandler()` factory |
| Hooks Location | `src/api/client/[domain].ts` |
| Cron Endpoints | `GET /api/v1/cron/[action]` with `X-Cron-Secret` header |

---

## Phase 0: Foundation ✅ DONE

- [x] `src/api/contracts/_shared.ts` — common Zod schemas
- [x] `src/api/lib/response.ts` — ApiResponse helpers
- [x] `src/api/lib/create-handler.ts` — handler factories (createHandler, createProtectedHandler, createAdminHandler, createCronHandler)
- [x] `src/api/lib/index.ts` — barrel exports
- [x] `src/api/client/_query-client.ts` — React Query config
- [x] `src/api/client/index.ts` — barrel exports
- [x] `src/app/api/v1/` — scaffold 22 domain folders

---

## Phase 1: Contracts

Extract Zod schemas from tRPC routers into `src/api/contracts/[domain].ts`.

### Tasks

- [ ] `src/api/contracts/auth.ts` — Extract from `src/trpc/routers/auth.ts`
- [ ] `src/api/contracts/festivals.ts` — Extract from `src/trpc/routers/festivals.ts`
- [ ] `src/api/contracts/students.ts` — Extract from `src/trpc/routers/students.ts`
- [ ] `src/api/contracts/groups.ts` — Extract from `src/trpc/routers/groups.ts`
- [ ] `src/api/contracts/categories.ts` — Extract from `src/trpc/routers/categories.ts`
- [ ] `src/api/contracts/assignments.ts` — Extract from `src/trpc/routers/assignments.ts`
- [ ] `src/api/contracts/programmes.ts` — Extract from `src/trpc/routers/programmes.ts`
- [ ] `src/api/contracts/judges.ts` — Extract from `src/trpc/routers/judges.ts`
- [ ] `src/api/contracts/members.ts` — Extract from `src/trpc/routers/members.ts`
- [ ] `src/api/contracts/stages.ts` — Extract from `src/trpc/routers/stages.ts`
- [ ] `src/api/contracts/schedule.ts` — Extract from `src/trpc/routers/schedule.ts`
- [ ] `src/api/contracts/results.ts` — Extract from `src/trpc/routers/results.ts`
- [ ] `src/api/contracts/notifications.ts` — Extract from `src/trpc/routers/notifications.ts`
- [ ] `src/api/contracts/payments.ts` — Extract from `src/trpc/routers/payments.ts`
- [ ] `src/api/contracts/billing.ts` — Extract from `src/trpc/routers/billing.ts`
- [ ] `src/api/contracts/gallery.ts` — Extract from `src/trpc/routers/gallery.ts`
- [ ] `src/api/contracts/news.ts` — Extract from `src/trpc/routers/news.ts`
- [ ] `src/api/contracts/upload.ts` — Extract from `src/trpc/routers/upload.ts`
- [ ] `src/api/contracts/profile.ts` — Extract from `src/trpc/routers/profile.ts`
- [ ] `src/api/contracts/my-festival.ts` — Extract from `src/trpc/routers/my-festival.ts`
- [ ] `src/api/contracts/team-leader.ts` — Extract from `src/trpc/routers/team-leader.ts`
- [ ] `src/api/contracts/cron.ts` — Extract from `src/trpc/routers/cron.ts`

### Contract Schema Pattern

```typescript
// src/api/contracts/festivals.ts
import { z } from "zod";

export const festivalSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ...
});

export const createFestivalInput = festivalSchema.pick({ name: true, ... }).extend({ ... });
export const updateFestivalInput = createFestivalInput.partial();

export type Festival = z.infer<typeof festivalSchema>;
export type CreateFestivalInput = z.infer<typeof createFestivalInput>;
export type UpdateFestivalInput = z.infer<typeof updateFestivalInput>;
```

---

## Phase 2: Route Handlers

Implement `src/app/api/v1/[domain]/route.ts` for all 22 domains.

### Tasks

- [ ] `src/app/api/v1/auth/route.ts` — login, register, logout, me, etc.
- [ ] `src/app/api/v1/festivals/route.ts`
- [ ] `src/app/api/v1/students/route.ts`
- [ ] `src/app/api/v1/groups/route.ts`
- [ ] `src/app/api/v1/categories/route.ts`
- [ ] `src/app/api/v1/assignments/route.ts`
- [ ] `src/app/api/v1/programmes/route.ts`
- [ ] `src/app/api/v1/judges/route.ts`
- [ ] `src/app/api/v1/members/route.ts`
- [ ] `src/app/api/v1/stages/route.ts`
- [ ] `src/app/api/v1/schedule/route.ts`
- [ ] `src/app/api/v1/results/route.ts`
- [ ] `src/app/api/v1/notifications/route.ts`
- [ ] `src/app/api/v1/payments/route.ts`
- [ ] `src/app/api/v1/billing/route.ts`
- [ ] `src/app/api/v1/gallery/route.ts`
- [ ] `src/app/api/v1/news/route.ts`
- [ ] `src/app/api/v1/upload/route.ts`
- [ ] `src/app/api/v1/profile/route.ts`
- [ ] `src/app/api/v1/my-festival/route.ts`
- [ ] `src/app/api/v1/team-leader/route.ts`
- [ ] `src/app/api/v1/cron/route.ts` — uses createCronHandler

### Handler Pattern

```typescript
// src/app/api/v1/festivals/route.ts
import { createProtectedHandler, ok, badRequest } from "@/api/lib";
import { createFestivalInput } from "@/api/contracts/festivals";

const handler = createProtectedHandler({
  async GET({ user }) {
    const festivals = await findFestivalsByOwner(user!.userId);
    return ok(festivals);
  },
  async POST({ user, request }) {
    const body = await request.json();
    const parsed = createFestivalInput.safeParse(body.data ?? body);
    if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);
    const festival = await createFestival({ ...parsed.data, ownerId: user!.userId });
    return ok(festival);
  },
});

export const GET = handler;
export const POST = handler;
```

---

## Phase 3: React Query Hooks

Create `src/api/client/[domain].ts` files with typed hooks for all 22 domains.

### Tasks

- [ ] `src/api/client/auth.ts` — useLogin, useLogout, useMe, useRegister
- [ ] `src/api/client/festivals.ts` — useFestivals, useCreateFestival, useUpdateFestival, useDeleteFestival
- [ ] `src/api/client/students.ts` — useStudents, useCreateStudent, useBulkCreateStudents, etc.
- [ ] `src/api/client/groups.ts`
- [ ] `src/api/client/categories.ts`
- [ ] `src/api/client/assignments.ts`
- [ ] `src/api/client/programmes.ts`
- [ ] `src/api/client/judges.ts`
- [ ] `src/api/client/members.ts`
- [ ] `src/api/client/stages.ts`
- [ ] `src/api/client/schedule.ts`
- [ ] `src/api/client/results.ts`
- [ ] `src/api/client/notifications.ts`
- [ ] `src/api/client/payments.ts`
- [ ] `src/api/client/billing.ts`
- [ ] `src/api/client/gallery.ts`
- [ ] `src/api/client/news.ts`
- [ ] `src/api/client/upload.ts`
- [ ] `src/api/client/profile.ts`
- [ ] `src/api/client/my-festival.ts`
- [ ] `src/api/client/team-leader.ts`

### Hook Pattern

```typescript
// src/api/client/festivals.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Festival, CreateFestivalInput } from "@/api/contracts/festivals";

const API_BASE = "/api/v1";

export function useFestivals() {
  return useQuery<Festival[]>({
    queryKey: ["festivals"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/festivals`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateFestival() {
  const qc = useQueryClient();
  return useMutation<Festival, Error, CreateFestivalInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/festivals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["festivals"] }),
  });
}
```

---

## Phase 4: Update Feature Hook Usages

Update all imports from old tRPC hooks to new `src/api/client/` hooks.

### Tasks

- [ ] Update imports in `src/features/festivals/**/*.tsx`
- [ ] Update imports in `src/features/students/**/*.tsx`
- [ ] Update imports in `src/features/groups/**/*.tsx`
- [ ] Update imports in `src/features/categories/**/*.tsx`
- [ ] Update imports in `src/features/assignments/**/*.tsx`
- [ ] Update imports in `src/features/programmes/**/*.tsx`
- [ ] Update imports in `src/features/judges/**/*.tsx`
- [ ] Update imports in `src/features/members/**/*.tsx`
- [ ] Update imports in `src/features/stages/**/*.tsx`
- [ ] Update imports in `src/features/schedule/**/*.tsx`
- [ ] Update imports in `src/features/results/**/*.tsx`
- [ ] Update imports in `src/features/notifications/**/*.tsx`
- [ ] Update imports in `src/features/payments/**/*.tsx`
- [ ] Update imports in `src/features/billing/**/*.tsx`
- [ ] Update imports in `src/features/users/**/*.tsx`
- [ ] Delete old hook files in `src/features/*/hooks/`

### Import Pattern Change

```typescript
// BEFORE
import { useFestivals, useCreateFestival } from "@/features/festivals/hooks/use-festivals";
import { useTRPC } from "@/trpc/client";

// AFTER
import { useFestivals, useCreateFestival } from "@/api/client/festivals";
```

---

## Phase 5: Provider Setup

- [ ] Replace `TRPCReactProvider` with `QueryClientProvider` in root layout
- [ ] Remove all `useTRPC`, `useTRPCClient` imports
- [ ] Remove `HydrateClient` / `getDehydratedState` tRPC helpers (or reimplement)

### Files to Update

- `src/app/layout.tsx` — Replace TRPC provider
- Any component using `useTRPC` or `useTRPCClient`

---

## Phase 6: Remove tRPC

- [ ] Remove from `package.json`:
  - `@trpc/client`
  - `@trpc/server`
  - `@trpc/tanstack-react-query`
- [ ] Delete `src/trpc/` directory
- [ ] Delete `src/app/api/trpc/` route handler
- [ ] Delete any legacy REST routes not under `v1/`
- [ ] Run `npm run lint` and fix all broken imports
- [ ] Run `npm run build` to verify

---

## Verification

After each phase:
- [ ] `npm run lint` — zero warnings
- [ ] Manual smoke test

After Phase 6:
- [ ] `npm run build` — successful
- [ ] All features functional
- [ ] Zero tRPC imports remaining
