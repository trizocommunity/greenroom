# Zustand Migration: Replace Context API with Zustand for UI State

## Status
- **Created**: 2026-07-22
- **Status**: Approved
- **Priority**: Medium
- **Complexity**: Medium-High

---

## Summary

Replace React Context API with Zustand for cross-cutting UI state management. Currently the codebase uses Context API for Festival data, Unsaved Changes tracking, and Sidebar state. Zustand provides better selector-based subscriptions reducing unnecessary re-renders, requires no Provider wrapping, and has a lighter API surface.

---

## Problem Statement

1. **Context re-render cascade** â€” Context API re-renders all consumers when any value changes. The `UnsavedChangesProvider` has 10+ state dependencies causing widespread re-renders.
2. **Boilerplate** â€” Creating a Context requires Provider component + useContext hook + TypeScript boilerplate. Zustand stores are simpler.
3. **No selector pattern** â€” Context API doesn't support fine-grained subscriptions. Components re-render even when reading unrelated slices.
4. **Scattered state** â€” UI state is split across multiple Contexts with no unified pattern for accessing it.

---

## Solution

### Architecture

**Keep TanStack Query for:**
- Server state (API data fetching, caching, invalidation)
- All data that needs background sync
- Optimistic updates

**Move to Zustand for:**
- Festival public metadata (read-only, no server sync needed)
- Sidebar open/close state
- Unsaved changes tracking
- Auth layout preferences

**Store location:** `src/stores/` (centralized, cross-cutting state)

```
src/
â”œâ”€â”€ stores/                              # NEW
â”‚   â”œâ”€â”€ festival-store.ts
â”‚   â”œâ”€â”€ ui-store.ts
â”‚   â”œâ”€â”€ unsaved-changes-store.ts
â”‚   â””â”€â”€ auth-layout-store.ts
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ festival/
â”‚   â”‚   â””â”€â”€ FestivalContext.tsx         # DELETE
â”‚   â”œâ”€â”€ common/
â”‚   â”‚   â””â”€â”€ UnsavedChangesProvider.tsx   # DELETE
â”‚   â””â”€â”€ ui/
â”‚       â”œâ”€â”€ sidebar.tsx                  # UPDATE (remove context)
â”‚       â””â”€â”€ form.tsx                     # KEEP (RHF integration)
â””â”€â”€ features/
    â””â”€â”€ ...
```

---

### Phase 1: Install Zustand

**Command:**
```bash
npm install zustand
```

**No other dependencies needed.**

---

### Phase 2: Festival Store

**New file:** `src/stores/festival-store.ts`

```typescript
import { create } from 'zustand'
import type { FestivalPublicData } from '@/features/festivals/types/festival.types'

interface FestivalStore {
  festival: FestivalPublicData | null
  setFestival: (festival: FestivalPublicData | null) => void
}

export const useFestivalStore = create<FestivalStore>((set) => ({
  festival: null,
  setFestival: (festival) => set({ festival }),
}))
```

**State:** Read-only festival public data (no actions needed beyond setter)

**Migration:**
- Delete `src/components/festival/FestivalContext.tsx`
- Update 15 consumer files to use `useFestivalStore()` instead of `useFestival()`

**Consumer hook mapping:**
```typescript
// OLD
const festival = useFestival()
// or
const { festival } = useFestival()

// NEW
const festival = useFestivalStore((s) => s.festival)
```

**Files to update:**
- `src/components/festival/AddMemberDialog.tsx`
- `src/components/festival/LeaderboardClient.tsx`
- `src/components/festival/use-festival-read-only.ts`
- `src/components/festival/DeadlinesCard.tsx`
- `src/components/festival/FestivalDashboardSidebar.tsx`
- `src/components/participant/BulkUploadParticipantsModal.tsx`
- `src/components/participant/ParticipantDialog.tsx`
- `src/components/participant/ParticipantProfileView.tsx`
- `src/components/participant/ParticipantDetailsDialog.tsx`
- `src/components/festival/ReadOnlyExpiredBanner.tsx`
- `src/hooks/use-feature.ts` (4 locations)
- `src/app/dashboard/[slug]/layout.tsx` (provider â†’ store initialization)

---

### Phase 3: UI Store (Sidebar)

**New file:** `src/stores/ui-store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarState = 'expanded' | 'collapsed'

interface UIStore {
  // Left sidebar
  leftOpen: boolean
  openMobileLeft: boolean
  setLeftOpen: (value: boolean | ((v: boolean) => boolean)) => void
  toggleLeftSidebar: () => void

  // Right sidebar
  rightOpen: boolean
  openMobileRight: boolean
  setRightOpen: (value: boolean | ((v: boolean) => boolean)) => void
  toggleRightSidebar: () => void

  // Derived
  leftState: SidebarState
  rightState: SidebarState
}
```

**Middleware:** `persist` for `leftOpen` (cookie alternative for desktop state)

**Side effects in `setLeftOpen`:**
- Write to `document.cookie` with `sidebar_state` name (keep existing behavior)
- Handle function updater pattern

**Not in store:** `isMobile` detection (keep using `useIsMobile()` hook)

**Migration:**
- Update `src/components/ui/sidebar.tsx` to export Zustand store
- Remove `SidebarProvider` component and `SidebarContext`
- Update 7 consumer files to use `useUIStore()` instead of `useSidebar()`

**Files to update:**
- `src/components/ui/sidebar.tsx` (refactor)
- `src/components/dashboard/AppSidebar.tsx`
- `src/components/festival/FestivalDashboardSidebar.tsx`
- `src/components/ui/Sidebar.tsx`
- `src/components/ui/SidebarTrigger.tsx`
- `src/components/ui/SidebarRail.tsx`
- `src/components/ui/SidebarMenuButton.tsx`

---

### Phase 4: Unsaved Changes Store

**New file:** `src/stores/unsaved-changes-store.ts`

```typescript
type NavigationAttempt = { proceed: () => void }
type SaveHandler = () => void | Promise<void>

interface UnsavedChangesStore {
  // State
  dirtyBySource: Record<string, boolean>
  saveHandlers: Record<string, SaveHandler>
  modalOpen: boolean
  pendingAttempt: NavigationAttempt | null
  enabled: boolean

  // Derived (computed via selectors)
  isDirty: boolean
  canSaveFromModal: boolean

  // Actions
  registerDirtySource: (id: string) => void
  unregisterDirtySource: (id: string) => void
  setDirty: (id: string, dirty: boolean) => void
  clearAllDirty: () => void
  registerSaveHandler: (id: string, handler: SaveHandler) => void
  unregisterSaveHandler: (id: string) => void
  requestNavigation: (attempt: NavigationAttempt) => boolean
  stayOnPage: () => void
  discardAndProceed: () => void
  saveAndProceed: () => Promise<void>
}
```

**Migration:**
- Delete `src/components/common/UnsavedChangesProvider.tsx`
- Delete `src/hooks/use-unsaved-changes.ts`
- Update 1 consumer file to use `useUnsavedChangesStore()` instead of `useUnsavedChanges()`

**Consumer hook mapping:**
```typescript
// OLD
const { isDirty, requestNavigation } = useUnsavedChanges()

// NEW
const isDirty = useUnsavedChangesStore((s) => s.isDirty)
const requestNavigation = useUnsavedChangesStore((s) => s.requestNavigation)
```

**Files to update:**
- `src/app/dashboard/[slug]/layout.tsx` (wrap with provider â†’ initialize store)
- `src/components/common/UnsavedChangesProvider.tsx` (delete)
- `src/hooks/use-unsaved-changes.ts` (delete)

---

### Phase 5: Auth Layout Store

**New file:** `src/stores/auth-layout-store.ts`

```typescript
interface AuthLayoutStore {
  align: 'left' | 'center'
  setAlign: (align: 'left' | 'center') => void
}
```

**Migration:**
- Update `src/components/auth/AuthLayout.tsx` to use Zustand
- Update 2 consumer files to use `useAuthLayoutStore()` instead of `useAuthLayout()`

**Files to update:**
- `src/components/auth/AuthLayout.tsx`
- `src/components/auth/MagicLinkRequestForm.tsx`

---

### Phase 6: Cleanup

**Delete after migration:**
- `src/components/festival/FestivalContext.tsx`
- `src/components/common/UnsavedChangesProvider.tsx`
- `src/hooks/use-unsaved-changes.ts`
- `src/hooks/use-festival.ts` (may be obsolete)

**Verify no remaining imports of deleted files before deletion.**

---

## Migration Notes

1. **Backward compatibility** â€” Migrate one store at a time, verify consumers work before proceeding
2. **Selector pattern** â€” Train team to use `useStore((s) => s.value)` for targeted subscriptions
3. **No Provider wrapping** â€” Zustand stores don't need Providers, but `create()` initializes on first use
4. **Persist middleware** â€” For sidebar state, use `persist` instead of manual cookie writes
5. **Server components** â€” Any Server Component currently wrapping a Context Provider needs refactoring (move client boundary)

---

## Configuration Changes

**No configuration changes needed.** Zustand requires no setup/config file.

---

## Testing Strategy

1. **Unit tests** â€” Test each store's actions in isolation
2. **Integration tests** â€” Verify UI updates correctly when store state changes
3. **Manual QA** â€” Test sidebar toggle, unsaved changes modal, festival data display

---

## Acceptance Criteria

- [ ] Zustand installed with no breaking changes
- [ ] `FestivalContext` migrated to `useFestivalStore` â€” 15 consumers updated
- [ ] Sidebar state migrated to `useUIStore` â€” 7 consumers updated
- [ ] `UnsavedChangesProvider` migrated to `useUnsavedChangesStore` â€” functional parity maintained
- [ ] `AuthLayoutContext` migrated to `useAuthLayoutStore` â€” 2 consumers updated
- [ ] Old Context files deleted
- [ ] No Provider components needed for Zustand stores
- [ ] All existing functionality preserved (sidebar cookies, dirty state tracking, navigation guards)
