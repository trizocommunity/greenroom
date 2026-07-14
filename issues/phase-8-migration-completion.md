# Phase 8: Migration Completion & React Query Full Implementation

**Status:** 🔲 TODO

## Goal

Complete the tRPC-to-Next.js-Route-Handlers migration by fixing stale references, resolving type-safety gaps between frontend and backend, and fully implementing React Query features (optimistic updates, background refetch, proper caching, retries).

---

## Executive Summary

The tRPC migration is **functionally complete** — no tRPC code remains — but **two stale references** still exist and **end-to-end type safety** between frontend and backend is incomplete because ts-rest is barely utilized. React Query is configured but **optimistic updates are documented but not implemented**, and **background refetch is disabled**.

| Category | Count | Risk |
|----------|-------|------|
| Stale tRPC references | 2 | HIGH - broken code |
| ts-rest contract not used by frontend hooks | 22 domains | MEDIUM - type safety gap |
| Auth route response format mismatches | 3 routes | HIGH - runtime errors |
| Mutations without optimistic updates | All 22 domains | MEDIUM - UX |
| Background refetch disabled | Global | LOW - UX preference |

---

## Critical Issues Found

### 1. Stale tRPC References (MUST FIX)

#### `vitest.config.ts:9`
```typescript
include: ["src/trpc/**/*.test.ts"],
```
- **Issue:** Folder `src/trpc/` does not exist
- **Fix:** Remove this line or update to valid test pattern

#### `src/core/integrations/cloudinary.ts:52`
```typescript
const res = await fetch("/api/trpc/upload.upload", {
```
- **Issue:** This tRPC endpoint no longer exists
- **Fix:** Update to call `/api/v1/upload`

---

### 2. ts-rest Integration Incomplete

**Problem:** Two separate contract patterns exist:

| Location | Type | Used By |
|----------|------|---------|
| `src/contracts/auth.contract.ts` | Actual ts-rest contract with `initContract().router()` | Only `/api/auth/*` routes for validation |
| `src/api/contracts/*.ts` (22 files) | Pure Zod schemas (no ts-rest router) | Type definitions only |

**Frontend hooks don't use ts-rest at all** — they use raw `fetch` with a custom `handleResponse` wrapper. This means:
- No compile-time guarantee that API responses match contracts
- No runtime validation of responses against schemas
- ts-rest's end-to-end type safety is bypassed entirely

---

### 3. Auth Route Response Format Mismatches

**Frontend `handleResponse` expects:**
```typescript
if (!json.success) throw new Error(json.error.message);  // expects json.error to be an object with .message
return json.data;  // expects data wrapped in json.data
```

**Actual auth route responses:**

| Route | Frontend Expects | Actual Response |
|-------|------------------|-----------------|
| `POST /api/auth/login` | `{ success: true, data: { role } }` | `{ success: true, role }` (no `data` wrapper) |
| `GET /api/auth/me` | `{ success: true, data: User }` | `{ success: true, data: User }` | **OK** (but `json.error.message` still expected) |
| `/api/v1/*` routes | `{ success: true, data }` | `{ success: true, data }` via `ok()` helper | **OK** |

**Root cause:** Auth routes were not migrated to use the `ok()` helper pattern. They return raw `NextResponse.json()` instead of wrapping in `{ success, data }`.

---

### 4. React Query Features Not Fully Implemented

#### Optimistic Updates — NOT IMPLEMENTED
Phase 3 docs describe the pattern but **no hooks implement it**. All mutations use:
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["resource"] });
},
```
This causes visible loading states for every mutation. High-friction UX for delete, reorder, publish/unpublish operations.

#### Background Refetch — DISABLED
```typescript
refetchOnWindowFocus: false
```
Data never refetches when user returns to the tab. Users may see stale data.

---

## Recommended Actions for Phase 8

### Step 8.1: Fix Stale tRPC References (LOW, BREAKING)

#### 8.1.1: Update `vitest.config.ts`
```typescript
// Remove line 9:
include: ["src/trpc/**/*.test.ts"],

// Or replace with valid pattern:
include: ["src/**/*.test.ts"],
```

#### 8.1.2: Fix Cloudinary upload URL
**File:** `src/core/integrations/cloudinary.ts:52`

```typescript
// Before:
const res = await fetch("/api/trpc/upload.upload", {

// After:
const res = await fetch("/api/v1/upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ data: { file: base64, folder } }),
});
```

---

### Step 8.2: Standardize Auth Route Responses (HIGH)

All `/api/auth/*` routes must return `{ success: true, data: ... }` format.

#### Files to update:
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/complete-onboarding/route.ts`
- `src/app/api/auth/logout/route.ts`

#### Pattern to follow (from v1 routes):
```typescript
import { ok, badRequest, unauthorized } from "@/api/lib";

// In handler:
return ok({ role: user.globalRole });      // { success: true, data: { role } }
return badRequest("INVALID_CREDENTIALS", "Invalid email or password");
return unauthorized("Not authenticated");
```

#### Error format must be consistent:
```typescript
// All errors must return:
{ success: false, error: { code: "ERROR_CODE", message: "Human readable" } }

// NOT:
{ success: false, error: "Plain string message" }
```

---

### Step 8.3: Integrate ts-rest into Frontend Hooks (MEDIUM, TYPE SAFETY)

**Option A — Full ts-rest integration (recommended for type safety):**

Update all React Query hooks to use `@ts-rest/react-query`:

```typescript
// src/api/client/festivals.ts
import { contract as festivalsContract } from "@/contracts/festivals.contract";
import { apiClient } from "@/lib/ts-rest-client";

export function useFestivals() {
  return useQuery(festivalsContract.getFestivals.queryOptions(apiClient));
}

export function useCreateFestival() {
  return useMutation(festivalsContract.createFestival.mutationOptions(apiClient));
}
```

**Option B — Keep raw fetch, add response validation (simpler):**

Add Zod validation of API responses in `handleResponse`:

```typescript
async function handleResponse<T>(
  res: Response,
  schema: z.ZodType<T>
): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return schema.parse(json.data);  // Runtime validation
}
```

**Recommendation:** Option A for full end-to-end type safety. This requires creating ts-rest contracts for all 22 domains (currently only `auth.contract.ts` has a proper router).

---

### Step 8.4: Implement Optimistic Updates (MEDIUM, UX)

Implement for high-frequency mutations. Priority order:

#### 8.4.1: Delete operations (highest impact)
- `useDeleteStudent` — removes from list immediately
- `useDeleteGroup`
- `useDeleteCategory`
- `useDeleteProgramme`
- `useDeleteJudge`
- `useDeleteStage`
- `useDeleteScheduleItem`

#### 8.4.2: Toggle/Publish operations
- `usePublishResults` / `useUnpublishResults`
- `useMarkNotificationRead` / `useMarkAllNotificationsRead`

#### 8.4.3: Reorder operations
- `useReorderSchedule` (if exists)

#### Pattern (from phase-3 docs):
```typescript
export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; studentId: string }>({
    mutationFn: async ({ studentId }) => {
      const res = await fetch(`${API_BASE}/students/${studentId}`, { method: "DELETE" });
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, studentId }) => {
      await qc.cancelQueries({ queryKey: ["students", festivalId] });
      const prev = qc.getQueryData(["students", festivalId]);
      qc.setQueryData(["students", festivalId], (old: Student[]) =>
        old?.filter((s) => s.id !== studentId)
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      qc.setQueryData(["students", festivalId], ctx?.prev);
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
    },
  });
}
```

---

### Step 8.5: Enable Background Refetch (LOW, UX)

**File:** `src/api/client/_query-client.ts`

```typescript
// Change from:
refetchOnWindowFocus: false,

// To:
refetchOnWindowFocus: true,
```

**Consider adding stale-while-revalidate behavior** for frequently accessed data:
```typescript
staleTime: 30 * 1000,      // Consider stale after 30s
gcTime: 5 * 60 * 1000,    // Keep in cache for 5min
```

---

### Step 8.6: Add Query Key Factory (MAINTENANCE)

Create centralized query key management to prevent key typos and enable cache invalidation helpers:

```typescript
// src/api/client/_query-keys.ts
export const queryKeys = {
  festivals: {
    all: ["festivals"] as const,
    detail: (id: string) => ["festivals", id] as const,
  },
  students: {
    all: (festivalId: string) => ["students", festivalId] as const,
    detail: (festivalId: string, id: string) => ["students", festivalId, id] as const,
  },
  // ... all domains
} as const;
```

Then use in hooks:
```typescript
queryKey: queryKeys.students.all(festivalId),
```

---

## Files to Modify

### Fix Stale References
- `vitest.config.ts` — remove stale include
- `src/core/integrations/cloudinary.ts` — update upload URL

### Auth Route Standardization
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/complete-onboarding/route.ts`
- `src/app/api/auth/logout/route.ts`

### React Query Improvements
- `src/api/client/_query-client.ts` — enable background refetch
- `src/api/client/students.ts` — add optimistic delete
- `src/api/client/groups.ts` — add optimistic delete
- `src/api/client/categories.ts` — add optimistic delete
- `src/api/client/programmes.ts` — add optimistic delete
- `src/api/client/judges.ts` — add optimistic delete
- `src/api/client/stages.ts` — add optimistic delete
- `src/api/client/schedule.ts` — add optimistic delete
- `src/api/client/results.ts` — add optimistic publish/unpublish
- `src/api/client/notifications.ts` — add optimistic mark read
- `src/api/client/_query-keys.ts` — new file for query key factory

### ts-rest Integration (if Option A chosen)
- Create `src/contracts/festivals.contract.ts` — ts-rest router for festivals
- Create `src/contracts/students.contract.ts` — ts-rest router for students
- ... (22 domain contracts)
- Update `src/api/client/*.ts` — use ts-rest queryOptions
- Update `src/lib/ts-rest-client.ts` — wire up all contracts

---

## Verification Checklist for Phase 8

### Stale References
- [ ] `vitest.config.ts` — stale include removed
- [ ] `cloudinary.ts` — upload calls `/api/v1/upload`

### Auth Routes
- [ ] All `/api/auth/*` routes return `{ success: true, data: ... }`
- [ ] All errors return `{ success: false, error: { code, message } }`
- [ ] `use-login`, `use-register`, `use-me` hooks work without `json.error.message` errors

### React Query
- [ ] `npm run dev` — no console errors on mutations
- [ ] Delete student — list updates instantly (optimistic)
- [ ] Publish results — UI updates instantly (optimistic)
- [ ] Switch tabs and return — data refetches (background refetch)
- [ ] Network failure — exponential retry visible in network tab

### Type Safety
- [ ] ts-rest contracts cover all API endpoints (if Option A)
- [ ] Hook response types match route handler return types
- [ ] No `as any` casts in API layer

### General
- [ ] `npm run lint` — zero warnings
- [ ] `npm run build` — successful build
- [ ] `npm run test:run` — all tests pass

---

## Dependencies

- Phase 8 does not block any other phase
- Phase 8 depends on Phase 0-7 being complete (migration infrastructure in place)

---

## Notes

- ts-rest Option A is a larger effort (22 router files) but provides true end-to-end type safety
- ts-rest Option B is simpler but still adds runtime validation
- Background refetch is a UX decision — some apps prefer manual refresh; confirm with product
- Optimistic updates require careful handling of rollback on error — ensure error boundary exists
- Auth routes still exist in two forms: `/api/auth/*` (legacy) and `/api/v1/auth` (v1). Phase 8 standardizes the legacy routes to match v1 response format.
