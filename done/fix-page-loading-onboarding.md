# Remove Page Loading Flash During Route Transitions

## Context

Onboarding and other auth-protected routes show blank/loading state during navigation due to missing loading states and race conditions.

## Root Causes Identified

### 1. Missing `loading.tsx` in onboarding routes
- No fallback for `/onboarding`, `/onboarding/personal`, `/onboarding/institutional`
- Server-side `getCurrentUser()` blocks rendering without loading indicator

### 2. Race condition in `use-auth.ts` hooks (lines 86-90, 114-118, 147-151)
```typescript
// Current - problematic
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["me"] }); // async, not awaited
  router.push("/profile");
  router.refresh(); // runs before invalidation completes
}
```

### 3. Plain `<a href>` used instead of Next.js `<Link>` in onboarding page (line 29, 44)
- Loses client-side navigation benefits

### 4. No Suspense boundary in `(auth)/layout.tsx`

## Implementation Plan

### Step 1: Add `loading.tsx` to onboarding routes
- [ ] Create `src/app/(auth)/onboarding/loading.tsx` with centered spinner
- [ ] Create `src/app/(auth)/onboarding/personal/loading.tsx`
- [ ] Create `src/app/(auth)/onboarding/institutional/loading.tsx`

### Step 2: Fix race condition in auth hooks
- [ ] Update `use-complete-personal-onboarding.ts` - await invalidation before push
- [ ] Update `use-complete-institutional-onboarding.ts` - same fix
- [ ] Alternative: Remove `router.refresh()` since invalidation handles cache

### Step 3: Replace `<a href>` with `<Link>` in onboarding page
- [ ] `src/app/(auth)/onboarding/page.tsx` - change `<a href` to `<Link`

### Step 4: Add Suspense to auth layout
- [ ] `src/app/(auth)/layout.tsx` - wrap children in Suspense with skeleton fallback

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(auth)/onboarding/loading.tsx` | Create |
| `src/app/(auth)/onboarding/personal/loading.tsx` | Create |
| `src/app/(auth)/onboarding/institutional/loading.tsx` | Create |
| `src/features/auth/hooks/use-auth.ts` | Fix async/await |
| `src/app/(auth)/onboarding/page.tsx` | Link component |
| `src/app/(auth)/layout.tsx` | Add Suspense |

## Effort

Small - 4-6 files, straightforward changes.
