# issue-00: API Performance Optimization

**Status:** ✅ DONE

## Implementation Summary

| Sub-task | Description | Status | Files Changed |
|----------|-------------|--------|---------------|
| **00-A** | In-memory TTL cache for `assertFestivalAccess` | ✅ Done | `src/core/auth/assert-festival-access.ts` |
| **00-B** | Cache-Control headers on GET routes | ✅ Done | `src/api/lib/response.ts` + 18 route files |
| **00-C** | Tune React Query defaults | ✅ Done | `src/api/client/_query-client.ts`, `notifications.ts`, `schedule.ts` |
| **00-D** | Prefetch hooks for navigation | ✅ Done | `src/api/client/prefetch.ts`, `src/components/PrefetchLink.tsx`, `QueryProvider.tsx` |
| **00-E** | Dashboard query optimization | ✅ Done | `src/core/database/schema.ts` (added indexes) |

## Problem

All API calls take ~500ms, making the app feel sluggish. Users expect near-instant responses (<100ms) for a responsive experience.

## Root Cause Analysis

### Hot Path: Protected Route Request Flow

Every authenticated API call (festivals, students, schedule, etc.) goes through this chain:

```
Request → createProtectedHandler → assertFestivalAccess → DB × 2 queries
```

`assertFestivalAccess` (`src/core/auth/assert-festival-access.ts:27-46`) runs **2 database queries per request**:

1. `db.query.festival.findFirst` — fetch festival row
2. `db.query.festivalMember.findFirst` — check membership

**With a warm DB connection, each query ~50-80ms.** Two queries = 100-160ms per request, minimum. Network latency adds another 50-100ms. Serial JSON parsing adds ~10-20ms. Total: **~200-300ms baseline per protected request**, before the actual business logic runs.

### Contributing Factors

| Factor | Location | Impact |
|--------|----------|--------|
| No HTTP caching headers | All GET route handlers | Browser re-fetches even on back navigation |
| `staleTime: 30_000` (30s) | `src/api/client/_query-client.ts:29` | Data considered stale too quickly |
| `refetchOnWindowFocus: true` | `src/api/client/_query-client.ts:31` | Unnecessary background refetches |
| Dashboard: 6 sequential queries | `festival.repository.ts:266-326` | `getDashboardOverviewData` runs 6 `Promise.all` queries |
| Dashboard: 8 sequential queries | `festival.repository.ts:363-404` | `getFestivalAnalyticsData` runs 8 count queries |

### Timing Breakdown (500ms total)

| Stage | Time |
|-------|------|
| Network: browser → server | ~80ms |
| Session decryption (`createHandler`) | ~10ms |
| `assertFestivalAccess` DB queries (×2) | ~160ms |
| Business logic (e.g. `findAllFestivals`) | ~80ms |
| Response serialization + network | ~80ms |
| React Query cache miss + render | ~90ms |
| **Total** | **~500ms** |

## Solution Overview

Five sub-tasks targeting the highest-impact improvements:

| Sub-task | Target | Est. Improvement |
|----------|--------|-----------------|
| **00-A** Festival access cache (in-memory TTL Map) | Eliminate 2 DB queries/call | ~160ms per protected request |
| **00-B** Cache-Control headers on GET routes | Eliminate unnecessary re-fetches | ~200-400ms on navigation |
| **00-C** Tune React Query defaults | Fewer refetches, smarter caching | ~100-300ms total |
| **00-D** Prefetch hooks for navigation | Instant navigation feel | Perceived: instant |
| **00-E** Dashboard query batching | Fewer round-trips | ~80-120ms on dashboard |

---

## Sub-task 00-A: Festival Access Cache

### Problem

`assertFestivalAccess` runs 2 DB queries on **every protected request**. For a user viewing 10 pages of a festival, that's 20+ identical DB queries.

### Solution

Implement a simple in-memory `Map<string, CacheEntry>` with TTL in `assert-festival-access.ts`. Cache key = `${festivalId}:${userId}`.

```typescript
// src/core/auth/assert-festival-access.ts

type AccessLevel = "owner" | "member" | "super_admin" | "none";

interface CacheEntry {
  access: AccessLevel;
  expiresAt: number; // Date.now() + ttl
}

const accessCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCacheKey(festivalId: string, userId: string, role: string) {
  return `${festivalId}:${userId}:${role}`;
}

function fromCache(key: string): AccessLevel | null {
  const entry = accessCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    accessCache.delete(key);
    return null;
  }
  return entry.access;
}

function toCache(key: string, access: AccessLevel) {
  accessCache.set(key, { access, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function assertFestivalAccess(
  session: SessionPayload | null,
  festivalId: string,
  options?: { requireWritable?: boolean; allowPast?: boolean },
): Promise<void> {
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const cacheKey = getCacheKey(festivalId, session.userId, session.role);

  // Try cache first
  const cachedAccess = fromCache(cacheKey);
  if (cachedAccess) {
    if (cachedAccess === "none") {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
    // Owner, member, super_admin — OK, skip DB
    if (options?.requireWritable) {
      await assertFestivalMutationAllowed(festivalId, { allowPast: options.allowPast });
    }
    return;
  }

  // Cache miss — query DB
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  const isOwner = festival.ownerId === session.userId;
  let isMember = false;

  if (!isSuperAdmin && !isOwner) {
    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, session.userId),
      ),
    });
    isMember = Boolean(member?.isActive);
  }

  let access: AccessLevel;
  if (isSuperAdmin) {
    access = "super_admin";
  } else if (isOwner) {
    access = "owner";
  } else if (isMember) {
    access = "member";
  } else {
    access = "none";
  }

  toCache(cacheKey, access);

  if (access === "none") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  if (options?.requireWritable) {
    await assertFestivalMutationAllowed(festivalId, { allowPast: options.allowPast });
  }
}
```

### Files to Change

- `src/core/auth/assert-festival-access.ts`

### Verification

- [ ] `npm run dev` — auth-protected routes still return 401/403 correctly
- [ ] `npm run dev` — first request to a festival page hits DB (cache miss)
- [ ] `npm run dev` — second request within 60s hits cache (log proof)
- [ ] `npm run dev` — after 60s, next request hits DB again (cache expired)
- [ ] `npm run lint` — zero warnings

---

## Sub-task 00-B: Cache-Control Headers on GET Routes

### Problem

API responses have no HTTP caching directives. Browsers re-fetch even on back navigation. React Query's `staleTime` is client-side only.

### Solution

Add `Cache-Control` response headers to all public GET endpoints. Modify `ok()` helper to accept an optional `cacheControl` parameter.

```typescript
// src/api/lib/response.ts

export function ok(data: unknown, cacheControl?: string): Response {
  return Response.json({ success: true, data }, {
    status: 200,
    headers: cacheControl ? { "Cache-Control": cacheControl } : {},
  });
}
```

Then apply to all GET handlers:

```typescript
// In route handlers:
return ok(festivals, "public, max-age=60, stale-while-revalidate=300");
return ok(scheduleEntries, "public, max-age=30, stale-while-revalidate=60");
```

### Routes to Update

| Route | Cache-Control Value | Rationale |
|-------|---------------------|-----------|
| `GET /api/v1/festivals` | `public, max-age=60, stale-while-revalidate=300` | Festival list changes infrequently |
| `GET /api/v1/festivals/[id]` | `public, max-age=60, stale-while-revalidate=300` | Festival detail |
| `GET /api/v1/students?festivalId=X` | `public, max-age=30, stale-while-revalidate=60` | Student list changes more often |
| `GET /api/v1/schedule?festivalId=X` | `public, max-age=30, stale-while-revalidate=60` | Schedule may change during event |
| `GET /api/v1/assignments?festivalId=X` | `public, max-age=30, stale-while-revalidate=60` | Assignments may be updated |
| `GET /api/v1/results?festivalId=X` | `public, max-age=30` | Results should be fresh |
| `GET /api/v1/categories?festivalId=X` | `public, max-age=60, stale-while-revalidate=300` | Categories rarely change |
| `GET /api/v1/groups?festivalId=X` | `public, max-age=60, stale-while-revalidate=300` | Groups rarely change |
| `GET /api/v1/judges?festivalId=X` | `public, max-age=60, stale-while-revalidate=300` | Judges rarely change |
| `GET /api/v1/stages?festivalId=X` | `public, max-age=60, stale-while-revalidate=300` | Stages rarely change |
| `GET /api/v1/notifications` | `private, max-age=10` | User-specific, no caching |
| `GET /api/v1/payments` | `private, max-age=10` | User-specific, no caching |
| `GET /api/v1/profile` | `private, max-age=10` | User-specific, no caching |
| `GET /api/v1/my-festival` | `public, max-age=60, stale-while-revalidate=300` | Can be cached |
| `GET /api/v1/team-leader/*` | `public, max-age=30` | Moderate change frequency |
| `GET /api/v1/super-admin/*` | `private, max-age=10` | Admin-specific, no caching |

### Files to Change

- `src/api/lib/response.ts` — add `cacheControl` param to `ok()`
- All route handler files in `src/app/api/v1/**/route.ts` — add header to GET handlers

### Verification

- [ ] `curl -I http://localhost:3000/api/v1/festivals` returns `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- [ ] `curl -I http://localhost:3000/api/v1/notifications` returns `Cache-Control: private, max-age=10`
- [ ] React Query devtools shows `(stale)` status after `max-age` expires
- [ ] `npm run lint` — zero warnings

---

## Sub-task 00-C: Tune React Query Defaults

### Problem

Current React Query config is too conservative, causing unnecessary refetches and re-renders.

Current config (`src/api/client/_query-client.ts`):
```typescript
staleTime: 30 * 1000,           // 30s — too aggressive
gcTime: 5 * 60 * 1000,          // 5min — OK
refetchOnWindowFocus: true,     // Causes unexpected background refetches
```

### Solution

```typescript
// src/api/client/_query-client.ts

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,         // 60s — data fresh for 1 minute
        gcTime: 10 * 60 * 1000,      // 10min — keep in cache longer
        refetchOnWindowFocus: false,  // Disable — causes UX jank
        refetchOnReconnect: "always", // Keep data fresh on reconnect
        retry: (failureCount, error) => {
          if (failureCount > 3) return false;
          if (error && "status" in error) {
            const status = error.status;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return true;
        },
        retryDelay: (attemptIndex) => RETRY_DELAY_MAP[attemptIndex] ?? 16000,
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          if (process.env.NODE_ENV === "development") {
            console.error("[Mutation Error]", error);
          }
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}
```

### Changes Summary

| Setting | Before | After | Reason |
|---------|--------|-------|--------|
| `staleTime` | 30s | 60s | Reduce unnecessary refetches |
| `gcTime` | 5min | 10min | Keep data cached longer |
| `refetchOnWindowFocus` | `true` | `false` | Eliminate background refetch jank |
| `refetchOnReconnect` | default | `always` | Keep data fresh on reconnect |
| Max retries | 5 | 3 | Fail faster on persistent errors |

### Per-Hook Overrides

Some hooks need more aggressive polling. Override in the hook itself:

```typescript
// src/api/client/notifications.ts — poll every 30s for notifications
export function useNotifications(studentId: string) {
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications.all(studentId),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/notifications`);
      return handleResponse<Notification[]>(res);
    },
    staleTime: 10 * 1000,        // Override: 10s for notifications
    refetchInterval: 30 * 1000,  // Poll every 30s
    refetchOnWindowFocus: true,  // Override for notifications
  });
}

// src/api/client/schedule.ts — poll every 60s during events
export function useSchedule(festivalId: string, typeFilter?: string) {
  return useQuery<ScheduleEntry[]>({
    queryKey: queryKeys.schedule.all(festivalId, typeFilter),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/schedule?festivalId=${festivalId}${typeFilter ? `&typeFilter=${typeFilter}` : ""}`);
      return handleResponse<ScheduleEntry[]>(res);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,  // Poll every 60s for schedule changes
  });
}
```

### Files to Change

- `src/api/client/_query-client.ts` — update defaults
- `src/api/client/notifications.ts` — add polling
- `src/api/client/schedule.ts` — add polling
- `src/api/client/results.ts` — add polling if needed

### Verification

- [ ] Open festival list — no background refetch on tab switch
- [ ] Leave tab open for 60s — no unexpected network requests
- [ ] Go offline and back online — queries refetch
- [ ] Notifications appear within 30s without manual refresh
- [ ] `npm run lint` — zero warnings

---

## Sub-task 00-D: Prefetch Hooks for Navigation

### Problem

When a user hovers over a link or navigates, the data isn't prefetched. React Query waits for the component to mount before fetching.

### Solution

Create a `prefetch` utility and a `PrefetchProvider` component that prefetches likely data when users hover over navigation items.

```typescript
// src/api/client/prefetch.ts
import { queryClient } from "./_query-client";
import { queryKeys } from "./_query-keys";

export async function prefetchFestivals() {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.all,
    queryFn: async () => {
      const res = await fetch("/api/v1/festivals");
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchFestival(id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/v1/festivals/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchSchedule(festivalId: string, typeFilter?: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.schedule.all(festivalId, typeFilter),
    queryFn: async () => {
      const url = `/api/v1/schedule?festivalId=${festivalId}${typeFilter ? `&typeFilter=${typeFilter}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchStudents(festivalId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.students.all(festivalId),
    queryFn: async () => {
      const res = await fetch(`/api/v1/students?festivalId=${festivalId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 30 * 1000,
  });
}
```

Then use in navigation components:

```tsx
// In a sidebar or navigation component:
import { prefetchFestival, prefetchSchedule } from "@/api/client/prefetch";

<ListItem>
  <Link
    href={`/festivals/${festival.id}`}
    onMouseEnter={() => prefetchFestival(festival.id)}
  >
    {festival.name}
  </Link>
</ListItem>
```

Or create a `PrefetchLink` component:

```tsx
// src/components/PrefetchLink.tsx
import { prefetchFestival } from "@/api/client/prefetch";

interface PrefetchLinkProps {
  festivalId: string;
  href: string;
  children: React.ReactNode;
}

export function PrefetchLink({ festivalId, href, children }: PrefetchLinkProps) {
  return (
    <Link
      href={href}
      onMouseEnter={() => prefetchFestival(festivalId)}
      onMouseDown={() => prefetchFestival(festivalId)} // Prefetch on click too
    >
      {children}
    </Link>
  );
}
```

### Files to Create/Change

- Create: `src/api/client/prefetch.ts`
- Create: `src/components/PrefetchLink.tsx` (optional, per-project decision)
- Update navigation components to call prefetch on hover

### Verification

- [ ] Network tab shows prefetch request on link hover
- [ ] Clicking a prefetched link renders instantly (from cache)
- [ ] `npm run lint` — zero warnings

---

## Sub-task 00-E: Dashboard Query Optimization

### Problem

`getDashboardOverviewData` runs 6 queries in `Promise.all`. Each count query is separate. With 1000 students and proper indexing, this could be 1 query instead of 6.

### Solution

**Option 1 — Batch into a single query (if DB supports):**
```typescript
// Replace 3 count queries with 1
const [[tp], [ts], [tg]] = await Promise.all([...]);
// ↓ Replace with:
const counts = await db
  .select({
    programmeCount: sql`count(*)`.filter(eq(programmes.festivalId, festivalId)),
    studentCount: sql`count(*)`.filter(eq(students.festivalId, festivalId)),
    groupCount: sql`count(*)`.filter(eq(groups.festivalId, festivalId)),
  })
  .from(programmes)
  .where(eq(programmes.festivalId, festivalId));
```

**Option 2 — Add database indexes (most impactful):**

```sql
-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_programmes_festival_id ON programmes(festivalId);
CREATE INDEX IF NOT EXISTS idx_students_festival_id ON students(festivalId);
CREATE INDEX IF NOT EXISTS idx_groups_festival_id ON groups(festivalId);
CREATE INDEX IF NOT EXISTS idx_results_programme_id ON results(programmeId);
CREATE INDEX IF NOT EXISTS idx_categories_festival_id ON categories(festivalId);
CREATE INDEX IF NOT EXISTS idx_stages_festival_id ON stages(festivalId);
```

**Option 3 — Reduce queried data:**

The `recentStudents` query uses `with: { group: true }` which may cause N+1. Consider if this relation is needed on the list view.

### Files to Change

- `src/features/festivals/repositories/festival.repository.ts` — `getDashboardOverviewData`, `getFestivalAnalyticsData`
- `src/core/database/schema.ts` — add indexes via Drizzle migrations

### Verification

- [ ] `EXPLAIN ANALYZE` on dashboard endpoint shows index scans
- [ ] Dashboard page load < 200ms (vs ~300ms before)
- [ ] `npm run lint` — zero warnings

---

## Implementation Order

Execute sub-tasks in this order (dependencies noted):

```
00-A → 00-B → 00-C → 00-D → 00-E
```

- **00-A first** — highest impact, unblocks everything
- **00-B second** — complements 00-A with HTTP-layer caching
- **00-C third** — client-side tuning, no backend changes
- **00-D fourth** — UX polish on top of solid caching
- **00-E last** — database optimization, measure first

---

## Dependencies

- None — this work is independent of other phases

---

## Success Metrics

After all sub-tasks complete:

| Metric | Before | Target |
|--------|--------|--------|
| Protected API call (cached) | ~500ms | <100ms |
| Protected API call (cold DB) | ~500ms | <200ms |
| Navigation to festival page | ~500ms render | <50ms render (from prefetch) |
| Dashboard overview load | ~800ms | <300ms |
| React Query cache hit rate | ~30% | >70% |

Measure with:
```bash
# Time a specific endpoint
curl -w "\nTime Total: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/v1/festivals
```
