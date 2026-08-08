# API Client Contract

This directory contains React Query hooks for fetching and mutating data in Greenroom. 

When interacting with the backend (via API routes or Server Actions), there is a strict dual-cache invalidation contract you must follow.

## The Problem

Greenroom uses Next.js App Router (RSC) and React Query on the client. 
When data is updated, **both** caches must be invalidated to prevent stale data.

1. **RSC / Next.js Cache**: Cached routes and server components.
2. **React Query Cache**: Client-side data fetching.

If you only invalidate React Query, the client might refetch and get a cached response from Next.js.
If you only invalidate Next.js, the client UI won't update until a hard refresh.

## The Contract

Every mutation must invalidate both caches.

### 1. Server-Side: `revalidatePath`

In your Server Action or API Route, you **must** call `revalidatePath` for the affected paths after a successful write.

```typescript
// src/features/my-feature/actions.ts
import { revalidatePath } from "next/cache";

export async function createItemAction(festivalId: string, data: any) {
  const result = await db.insert(...);
  
  // 🔴 REQUIRED: Invalidate Next.js cache
  revalidatePath(`/dashboard/${festivalSlug}/my-feature`);
  
  return result;
}
```

### 2. Client-Side: `qc.invalidateQueries`

In your React Query mutation (or directly in your component if calling a server action), you **must** invalidate the relevant query keys.

```typescript
// src/api/client/my-feature.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./_query-keys";

export function useCreateItem() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => createItemAction(data),
    onSuccess: (data, variables) => {
      // 🔴 REQUIRED: Invalidate React Query cache
      qc.invalidateQueries({
        queryKey: queryKeys.myFeature.all(variables.festivalId),
      });
    },
  });
}
```

### 3. Usage of `tx ?? db` (Transactional Safety)

When writing multiple records (e.g., creating a user and an assignment), use transactions.
Pass an optional `tx?: typeof db` to your repository/service functions and default to `client = tx ?? db;` so they can be composed.

```typescript
export async function createParticipant(data: any, tx?: typeof db) {
  const client = tx ?? db;
  return await client.insert(participantTable).values(data);
}
```
