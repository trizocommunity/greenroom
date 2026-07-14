# Phase 7: Investigation & Cleanup

**Status:** 🔲 TODO

## Goal

Thoroughly investigate the current state of the tRPC removal project, identify missing migrations and unlisted dependencies, and complete all necessary cleanup before Phase 6 can safely proceed.

---

## Executive Summary

Phases 0-5 are marked as complete, but investigation revealed **critical gaps**:

| Category | Count | Risk |
|----------|-------|------|
| Files still importing from `@/trpc/` | 6 | HIGH - will break in Phase 6 |
| Hooks needing new API equivalents | 2 | HIGH - functionality loss |
| Legacy auth routes still in use | 7 | MEDIUM - double maintenance |
| Unused code (ts-rest client) | 2 files | LOW - dead code |
| Old hook files remaining | 5 files | LOW - cleanup needed |

---

## Critical Issues Found

### 1. Hooks Still Using tRPC (MUST FIX BEFORE PHASE 6)

#### `src/hooks/useCloudinaryUpload.ts`
```typescript
import { useTRPCClient } from "@/trpc/client";  // ← tRPC dependency
const trpc = useTRPCClient();
trpc.upload.upload.mutation({...});  // ← Calls tRPC procedure
```
- **Issue:** Uses `useTRPCClient` to call `trpc.upload.upload.mutation()`
- **Solution:** Create new `useUploadFile` hook in `@/api/client/upload.ts` that calls `/api/v1/upload`
- **Status:** v1 upload route EXISTS at `src/app/api/v1/upload/route.ts`

#### `src/features/payments/hooks/use-super-admin-payments.ts`
```typescript
import { useTRPC } from "@/trpc/client";  // ← tRPC dependency
trpc.superAdmin.payments.queryOptions()  // ← tRPC procedure
```
- **Issue:** Uses `trpc.superAdmin.payments.queryOptions()`
- **Solution:** Create new `useSuperAdminPayments` hook in `@/api/client/admin.ts` calling `/api/v1/super-admin/payments`
- **Status:** v1 super-admin route EXISTS at `src/app/api/v1/super-admin/route.ts`

#### `src/features/festivals/hooks/use-festival-payment.ts`
```typescript
import { useTRPC } from "@/trpc/client";  // ← tRPC dependency
trpc.payments.initiate.mutation()  // ← tRPC procedure
trpc.payments.verify.mutation()    // ← tRPC procedure
```
- **Issue:** Uses `trpc.payments.initiate` and `trpc.payments.verify` for Razorpay integration
- **Solution:** Create new payment initiation/verification hooks calling v1 payment routes
- **Status:** v1 payments route EXISTS at `src/app/api/v1/payments/route.ts`

#### `src/features/auth/hooks/use-users.ts`
```typescript
import { useTRPC } from "@/trpc/client";  // ← tRPC dependency
```
- **Issue:** Uses `useTRPC` hook
- **Solution:** Check if `useUsers` functionality is needed or can be replaced

#### `src/features/students/hooks/use-students.ts`
```typescript
import { useTRPC } from "@/trpc/client";  // ← tRPC dependency
```
- **Issue:** Still contains tRPC import (file still exists but is not imported by any component after Phase 4)
- **Solution:** File was already deleted in Phase 4 cleanup - verify no dangling references

---

### 2. Hooks Without New API Equivalents

#### `useFestivalPayment` (Razorpay Integration)
- **Current location:** `src/features/festivals/hooks/use-festival-payment.ts`
- **Used by:** `src/components/profile/tabs/OverviewTab.tsx`
- **Problem:** Full Razorpay payment flow wrapper - handles SDK loading, modal, verification
- **Required:** New `/api/v1/payments/initiate` and `/api/v1/payments/verify` routes with same functionality

#### `useSuperAdminPayments` (Admin Payments View)
- **Current location:** `src/features/payments/hooks/use-super-admin-payments.ts`
- **Used by:** `src/components/super-admin/PaymentsTable.tsx`
- **Problem:** Queries `trpc.superAdmin.payments.queryOptions()`
- **Required:** New `useSuperAdminPayments` hook in `@/api/client/admin.ts`

---

### 3. Legacy Auth Routes Still Active

The app currently uses **two separate auth systems**:

| System | Routes | Used By |
|--------|--------|---------|
| Legacy | `/api/auth/login`, `/api/auth/register`, etc. | `use-auth.ts` hooks |
| v1 | `/api/v1/auth` (uses `?action=login` query param) | Not wired up |

#### Legacy Routes (still in use, 7 files):
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/complete-onboarding/route.ts`

#### Problem:
- `use-auth.ts` hooks use `@/lib/api-client.ts` which calls legacy `/api/auth/*` routes
- v1 auth has different interface (uses `?action=login` query param pattern)
- **NOT a tRPC issue** - uses raw fetch, but routes are redundant with v1

#### Solution Options:
1. **Keep legacy routes** until v1 auth is fully implemented (pragmatic)
2. **Migrate to v1** by updating `api-client.ts` to call `/api/v1/auth` (recommended)
3. **Delete legacy routes** after v1 migration

---

### 4. Dead Code Found

#### `src/lib/ts-rest-client.ts`
- **Purpose:** ts-rest query client initialized with `authContract`
- **Finding:** **NEVER imported or used anywhere in codebase**
- **Action:** Delete in Phase 7 or Phase 6

#### `src/contracts/` (ts-rest contracts)
- **Files:** `auth.contract.ts`, `shared-schemas.ts`, `index.ts`
- **Used by:** Only `src/lib/ts-rest-client.ts` (which is unused)
- **Action:** Delete after ts-rest-client removal

---

### 5. Old Hook Files Remaining (5 files)

These were NOT deleted in Phase 4 because they have no v1 equivalents or are still needed:

| File | Reason Kept |
|------|-------------|
| `src/features/festivals/hooks/use-festival-read-only.ts` | Pure client-side (uses `useFestival()` context) - NO tRPC |
| `src/features/festivals/hooks/use-deadline-lock.ts` | Pure client-side date logic - NO tRPC |
| `src/features/festivals/hooks/use-festival-payment.ts` | tRPC dependency - NEEDS MIGRATION |
| `src/features/payments/hooks/use-super-admin-payments.ts` | tRPC dependency - NEEDS MIGRATION |
| `src/features/students/hooks/use-students.ts` | **Should be deleted** - only imported by `QrCodesClient.tsx` for `StudentsListItem` type |

---

### 6. Type Import Still Needed

#### `StudentsListItem` Type
- **Location:** `src/features/students/hooks/use-students.ts` (line 22)
- **Still imported by:** `src/components/festival/pre-event-works/qr-codes/QrCodesClient.tsx` (line 37)
- **Problem:** Type defined in old hook file that should be deleted
- **Solution:** Move `StudentsListItem` type to `@/api/contracts/students.ts`

---

## Files to Investigate Further

### `src/features/auth/hooks/use-users.ts`
- Check if `useUsers` is actually used anywhere
- May be dead code like ts-rest-client

### Server Actions (36 files with "use server")
- **Finding:** Server actions do NOT use tRPC
- They use direct database access via `db` and `getSession()`
- **No action needed** - server actions are independent of tRPC

---

## Recommended Actions for Phase 7

### Step 7.1: Migrate `useCloudinaryUpload` (HIGH PRIORITY)

**File:** `src/hooks/useCloudinaryUpload.ts`

Create new hook in `src/api/client/upload.ts`:
```typescript
export function useUploadFile() {
  return useMutation({
    mutationKey: ["upload"] as const,
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const base64Data = await fileToBase64(file);
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { file: base64Data, folder } }),
      });
      return handleResponse<{ url: string; publicId: string }>(res);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Upload failed");
    },
  });
}
```

**Update callers** to use new hook instead of `useTRPCClient`.

---

### Step 7.2: Create Payment API Hooks (HIGH PRIORITY)

**Files:**
- `src/features/festivals/hooks/use-festival-payment.ts` → needs v1 equivalent
- `src/features/payments/hooks/use-super-admin-payments.ts` → needs v1 equivalent

**Check v1 payment routes first:**
- `src/app/api/v1/payments/route.ts` - exists, check if `initiate` and `verify` actions exist
- `src/app/api/v1/super-admin/route.ts` - exists, check if `payments` action exists

If routes don't exist, create them. Then create hooks.

---

### Step 7.3: Move `StudentsListItem` Type (MEDIUM)

**From:** `src/features/students/hooks/use-students.ts`
**To:** `src/api/contracts/students.ts`

Then delete the old hook file entirely.

---

### Step 7.4: Audit `use-users.ts` (LOW)

**File:** `src/features/auth/hooks/use-users.ts`

Check if `useUsers` or `useSuperAdminPayments` from this file are actually used anywhere.

---

### Step 7.5: Delete Dead Code (LOW)

Delete if confirmed unused:
- `src/lib/ts-rest-client.ts`
- `src/contracts/` directory

---

### Step 7.6: Verify Auth Architecture (MEDIUM)

Decision needed: Should legacy `/api/auth/*` routes be:
1. **Kept** as-is (current state, functional but redundant)
2. **Migrated** to v1 (update `api-client.ts` to use `/api/v1/auth`)
3. **Deleted** after migration (Phase 6 item)

Recommend: Option 2 - Update `api-client.ts` to use v1 routes consistently.

---

### Step 7.7: Comprehensive Testing (HIGH)

Before Phase 6, test all features:
- [ ] Authentication (login, register, logout, password reset)
- [ ] Festival CRUD operations
- [ ] Student management (create, edit, delete, bulk upload)
- [ ] Group and category management
- [ ] Programme management
- [ ] Assignment management
- [ ] Judge management
- [ ] Member management
- [ ] Stage management
- [ ] Schedule management
- [ ] Results management
- [ ] Payment flow (Razorpay integration)
- [ ] Admin super-admin functions
- [ ] File uploads (Cloudinary)

---

## Verification Checklist for Phase 7

- [ ] `useCloudinaryUpload` migrated to `/api/v1/upload`
- [ ] Payment initiation/verification wired to v1 routes
- [ ] `StudentsListItem` type moved to contracts
- [ ] Old student hook file deleted
- [ ] `use-users.ts` audited (confirm used or deleted)
- [ ] Dead ts-rest client code deleted
- [ ] Auth architecture decision made and implemented
- [ ] All features tested manually
- [ ] `npm run lint` — zero warnings
- [ ] `npm run build` — successful build

---

## Dependencies

- Phase 7 must be completed BEFORE Phase 6 can safely proceed
- Phase 7 may reveal additional items not covered in this investigation

---

## Notes

- Server actions (36 files) are **NOT affected** by tRPC removal - they use direct database access
- `useFestivalReadOnly` and `useDeadlineLock` are **NOT tRPC issues** - pure client-side logic
- `useFeature` hooks are **NOT tRPC issues** - use `useFestival()` context
- Auth hooks (`useAuth`, `useCurrentUser`) use `@/lib/api-client` (raw fetch), NOT tRPC

(End of file - total 311 lines)
