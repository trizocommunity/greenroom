# Phase 9: Type Fixes — Migration Completion

**Status:** 🔲 TODO

## Goal

Fix all remaining TypeScript type errors across the frontend. These errors stem from:
1. React Query v5 breaking changes (mutation state properties renamed)
2. Incomplete Zod schemas that don't reflect actual API responses
3. Deleted/missing hooks still being imported
4. tRPC relation patterns not fully migrated to flat contract types
5. Wrong destructuring of React Query return values

---

## Executive Summary

| Category | Files | Errors | Root Cause |
|----------|-------|--------|------------|
| React Query v5 `isLoading` → `isPending` | 5 files | 5 | React Query v5 renamed mutation state |
| Incomplete contract schemas | 8 files | 25+ | tRPC relations not in Zod schemas |
| Missing exports/imports | 4 files | 6 | Hooks/types deleted but imports remain |
| Wrong hook return destructuring | 3 files | 8 | React Query returns object, not array |
| Wrong endpoint URL | 1 file | 1 | `/payments/history` → `/payments` |

---

## Category 1: React Query v5 — `isLoading` → `isPending`

**Root Cause:** React Query v5 removed `isLoading` from `useMutation`. Use `isPending` instead.

| File | Line | Old Code | New Code |
|------|------|----------|----------|
| `CategoriesClient.tsx` | 241 | `deleteCategory.isLoading` | `deleteCategory.isPending` |
| `CategoryDialog.tsx` | 80 | `createCategory.isLoading \|\| updateCategory.isLoading` | `createCategory.isPending \|\| updateCategory.isPending` |
| `ProgrammeDialog.tsx` | 137 | `createProgramme.isLoading \|\| updateProgramme.isLoading` | `createProgramme.isPending \|\| updateProgramme.isPending` |
| `ProgrammesClient.tsx` | 601 | `deleteProgramme.isLoading` | `deleteProgramme.isPending` |
| `AssignmentsClient.tsx` | 729 | `deleteAssignment.isLoading` | `deleteAssignment.isPending` |

**Note:** `isLoading` still exists on `useQuery`, but **never existed on `useMutation`** in v5.

---

## Category 2: Incomplete Zod Schemas — Missing Relations/Fields

### 2.1 Notification Schema: `message` vs `title`/`body`

**File:** `src/components/student/ProgrammeNotificationsClient.tsx:67-68`

**Problem:** Contract defines `message` but database/API returns `title` + `body`:
```typescript
// Contract (notifications.ts)
export const notificationSchema = z.object({
  message: z.string(),  // Wrong field name
});

// DB Schema actually has:
title: text(),    // The title
body: text(),     // The body
```

**Fix:** Update `notificationSchema` in `src/api/contracts/notifications.ts`:
```typescript
export const notificationSchema = z.object({
  id: z.string(),
  recipientStudentId: z.string(),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  type: z.string().nullable(),
  createdAt: z.string(),
});
```

---

### 2.2 Payment Schema: Missing `currency`, `used`, `tier`, `referenceId`

**Files:** `BillingTab.tsx`, `PaymentHistoryTab.tsx`, `PaymentsTable.tsx`

**Contract** (`payments.ts`):
```typescript
// PaymentHistoryItem is missing:
export const paymentHistoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  festivalId: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  providerId: z.string(),
  createdAt: z.string(),
  festival: z.object({ name: z.string(), slug: z.string() }).nullable(),
  razorpayOrderId: z.string(),
  razorpayId: z.string().nullable(),
  // MISSING: currency, used, tier, referenceId
});
```

**Database actually has:**
```typescript
currency: text(),      // MISSING in contract
referenceId: text(),   // MISSING in contract
used: boolean(),       // MISSING in contract
tier: tier(),         // MISSING in contract (BASIC | STANDARD | PRO)
```

**Fix:** Update `paymentHistoryItemSchema` in `src/api/contracts/payments.ts`:
```typescript
export const paymentHistoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  festivalId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  providerId: z.string(),
  referenceId: z.string().nullable(),
  used: z.boolean(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  createdAt: z.string(),
  festival: z.object({ name: z.string(), slug: z.string() }).nullable(),
  razorpayOrderId: z.string(),
  razorpayId: z.string().nullable(),
});
```

**Also:** The client `usePaymentHistory()` calls wrong endpoint:
```typescript
// Wrong:
fetch(`${API_BASE}/payments/history`)
// Should be:
fetch(`${API_BASE}/payments`)
```

---

### 2.3 UserStatus Schema: Wrong Structure

**File:** `src/components/profile/BillingTab.tsx:47-62`

**Contract** (`payments.ts`):
```typescript
export const userStatusSchema = z.object({
  hasCredit: z.boolean(),
  hasActiveFestival: z.boolean(),
  currentTier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  unusedCreditId: z.string().nullable(),
});
```

**Actual API returns** (`getUserStatusDomain`):
```typescript
{
  status: "ACTIVE" | "EXPIRED" | "NOT_PAID",
  payment: { ... } | null,
  canCreateFestival: boolean,
}
```

**Fix:** Update `userStatusSchema`:
```typescript
export const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "EXPIRED", "NOT_PAID"]),
  payment: z.object({
    id: z.string(),
    amount: z.number(),
    tier: z.string(),
    validFrom: z.string(),
  }).nullable(),
  canCreateFestival: z.boolean(),
});
```

---

### 2.4 Festival Schema: Missing `isLocked`, `tierLabel`

**Files:** `FestivalCard.tsx`, `JoinedFestivalCard.tsx`

**Contract** (`festivals.ts`):
```typescript
export const festivalSchema = z.object({
  // ... existing fields
  // MISSING: isLocked, tierLabel
});
```

**Fix:** Update `festivalSchema` in `src/api/contracts/festivals.ts`:
```typescript
export const festivalSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  location: z.string().nullable(),
  isPublic: z.boolean(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "EXPIRED"]),
  ownerId: z.string(),
  expiresAt: z.string().nullable(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  resultPdfUrl: z.string().nullable(),
  isLocked: z.boolean(),
  tierLabel: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

---

### 2.5 Judge Schema: Missing `activities`, `programmes`, `stages`

**File:** `src/components/festival/pre-event-works/judges/JudgesClient.tsx`

The `Judge` contract only has flat fields, but the repository returns relations:
```typescript
// Contract (judges.ts) - flat:
type Judge = {
  id: string;
  festivalId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// Repository returns with relations:
type FestivalJudgeWithAssignments = {
  id: string;
  name: string;
  description: string | null;
  activities: Array<{ configId, judgingMode, status, programme, stage, judgedPointsCount, averagePoints }>;
  programmes: Array<{ id, name }>;
  stages: Array<{ id, name }>;
};
```

**Fix:** Update `judgeSchema` in `src/api/contracts/judges.ts`:
```typescript
export const activitySchema = z.object({
  configId: z.string(),
  judgingMode: z.string(),
  status: z.string(),
  programme: z.object({ id: z.string(), name: z.string() }).nullable(),
  stage: z.object({ id: z.string(), name: z.string() }).nullable(),
  judgedPointsCount: z.number(),
  averagePoints: z.number().nullable(),
});

export const judgeSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activities: z.array(activitySchema).optional(),
  programmes: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  stages: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});
```

---

### 2.6 Student Schema: Missing `profileSlug`

**File:** `src/components/festival/pre-event-works/students/StudentsClient.tsx:290,302`

The component expects `tl.profileSlug` but `studentSchema` doesn't have it.

**Fix:** Either:
1. Add `profileSlug` to `studentSchema` if it exists in the DB
2. Or compute `profileSlug` from `studentId` + `festivalSlug` in the component

---

### 2.7 Assignment Schema: Missing `assignedAt`, `student`, `group`, `category`, `programme`

**File:** `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx:291-310`

The component expects nested relations (`a.programme`, `a.student`, `a.group`) but `assignmentSchema` only has flat IDs.

**Fix:** Update `assignmentSchema` in `src/api/contracts/assignments.ts`:
```typescript
export const programmeMinimalSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
});

export const studentMinimalSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  chestNumber: z.string().nullable(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const groupMinimalSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export const assignmentSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  programmeId: z.string(),
  studentId: z.string().nullable(),
  groupId: z.string().nullable(),
  teamNumber: z.number().int().positive().nullable(),
  createdByEmail: z.string().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedAt: z.string().nullable(),
  programme: programmeMinimalSchema.optional(),
  student: studentMinimalSchema.optional(),
  group: groupMinimalSchema.optional(),
  category: z.object({ id: z.string(), name: z.string() }).optional(),
});
```

---

## Category 3: Missing Exports/Imports

### 3.1 `useProgrammeDetails` → `useProgramme`

**File:** `src/components/festival/pre-event-works/programmes/ProgrammeDialog.tsx:48`

```typescript
// Wrong import:
import { useProgrammeDetails } from "@/api/client/programmes";

// Should be:
import { useProgramme } from "@/api/client/programmes";
```

Also update line 141 to use `useProgramme` (it already does).

---

### 3.2 `StudentsListItem` type missing

**File:** `src/components/festival/pre-event-works/qr-codes/QrCodesClient.tsx:37`

```typescript
// Imports from deleted file:
import type { StudentsListItem } from "@/features/students/hooks/use-students";
```

**Fix:** Either:
1. Define `StudentsListItem` in `src/api/contracts/students.ts` and export it
2. Or use `Student` type directly if it matches

---

### 3.3 `use-users.ts` completely missing

**File:** `src/components/super-admin/UsersTable.tsx:72`

```typescript
// Imports from non-existent file:
import { type User, useDeleteUser, useUpdateUser, useUsers } from "@/features/auth/hooks/use-users";
```

**Fix:** Either:
1. Recreate `use-users.ts` with these exports
2. Or migrate to using `@/api/client/admin.ts` hooks

---

### 3.4 `ProfileSidebar` LogoutButton children

**File:** `src/components/profile/ProfileSidebar.tsx:52`

```tsx
// LogoutButton doesn't accept children:
<LogoutButton>
  <button>...</button>
</LogoutButton>

// Should be:
<LogoutButton />
```

---

## Category 4: Wrong React Query Destructuring

### 4.1 `useGroups`/`useCategories` return object, not arrays

**File:** `src/components/festival/pre-event-works/students/StudentDialog.tsx:80-81`

```typescript
// Wrong - extracts non-existent properties:
const { groups } = useGroups(festivalId);
const { categories } = useCategories(festivalId);

// Correct:
const { data: groups = [] } = useGroups(festivalId);
const { data: categories = [] } = useCategories(festivalId);
```

---

### 4.2 `useStudents` returns query, not mutation helpers

**File:** `src/components/festival/pre-event-works/students/StudentsClient.tsx:100`

```typescript
// Wrong - useStudents returns query, not mutation helpers:
const { data: students = [], isLoading, deleteStudent, isDeleting } = useStudents(festivalId);

// Correct - deleteStudent and isDeleting come from useDeleteStudent mutation:
const { data: students = [], isLoading } = useStudents(festivalId);
const deleteStudent = useDeleteStudent();
```

---

### 4.3 `isUpdating` on query (doesn't exist)

**File:** `src/components/festival/pre-event-works/students/AssignTeamLeadersModal.tsx:65`

```typescript
// Wrong - useGroups returns query, not mutation:
const { data: groups = [], isUpdating } = useGroups(festivalId);

// Remove isUpdating - it's not available on queries
```

---

## Category 5: Wrong Endpoint URL

### 5.1 Payment History endpoint

**File:** `src/api/client/payments.ts:68`

```typescript
// Wrong:
const res = await fetch(`${API_BASE}/payments/history`);

// Correct:
const res = await fetch(`${API_BASE}/payments`);
```

---

## Category 6: Nullable Type Issues

### 6.1 `Student.name` is `string | null`

**File:** `src/components/festival/pre-event-works/groups/GroupDetailsDialog.tsx:75`

The component defines a local `Student` interface with `name: string` but the schema has `name: z.string().nullable()`.

**Fix:** Update local interface or use `student.name ?? ""`:
```typescript
// Change:
const isMatched = p.name === student.name;
// To:
const isMatched = p.name === (student.name ?? "");
```

---

## Files to Modify

### Schemas (Contract Updates)
- `src/api/contracts/notifications.ts` — fix `message` → `title` + `body`
- `src/api/contracts/payments.ts` — fix `PaymentHistoryItem`, `UserStatus`
- `src/api/contracts/festivals.ts` — add `isLocked`, `tierLabel`
- `src/api/contracts/judges.ts` — add `activities`, `programmes`, `stages`
- `src/api/contracts/assignments.ts` — add relations and `assignedAt`
- `src/api/contracts/students.ts` — add `profileSlug` if needed

### Client Hooks
- `src/api/client/payments.ts` — fix endpoint URL

### Component Fixes (isLoading → isPending)
- `src/components/festival/pre-event-works/categories/CategoriesClient.tsx`
- `src/components/festival/pre-event-works/categories/CategoryDialog.tsx`
- `src/components/festival/pre-event-works/programmes/ProgrammeDialog.tsx`
- `src/components/festival/pre-event-works/programmes/ProgrammesClient.tsx`
- `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx`

### Component Fixes (imports/exports)
- `src/components/festival/pre-event-works/programmes/ProgrammeDialog.tsx`
- `src/components/festival/pre-event-works/qr-codes/QrCodesClient.tsx`
- `src/components/super-admin/UsersTable.tsx`
- `src/components/profile/ProfileSidebar.tsx`

### Component Fixes (destructuring)
- `src/components/festival/pre-event-works/students/StudentDialog.tsx`
- `src/components/festival/pre-event-works/students/StudentsClient.tsx`
- `src/components/festival/pre-event-works/students/AssignTeamLeadersModal.tsx`

### Component Fixes (nullable)
- `src/components/festival/pre-event-works/groups/GroupDetailsDialog.tsx`

---

## Verification Checklist

### Schema Updates
- [ ] `notificationSchema` has `title` and `body` instead of `message`
- [ ] `paymentHistoryItemSchema` has `currency`, `used`, `tier`, `referenceId`
- [ ] `userStatusSchema` has `status`, `payment`, `canCreateFestival`
- [ ] `festivalSchema` has `isLocked`, `tierLabel`
- [ ] `judgeSchema` has `activities`, `programmes`, `stages`
- [ ] `assignmentSchema` has `assignedAt` and relation types

### Component Fixes
- [ ] All `isLoading` on mutations changed to `isPending`
- [ ] `useProgrammeDetails` import changed to `useProgramme`
- [ ] `StudentsListItem` properly imported or replaced
- [ ] `useUsers` imports fixed or redirected
- [ ] `ProfileSidebar` LogoutButton children removed
- [ ] `useGroups`/`useCategories` use `{ data: groups = [] }` pattern
- [ ] `useStudents` doesn't destructure mutation helpers

### API/Client
- [ ] `usePaymentHistory` calls correct endpoint `/payments`

### Build & Lint
- [ ] `npm run lint` — zero warnings
- [ ] `npm run build` — successful build
- [ ] `npm run test:run` — all tests pass

---

## Dependencies

- Phase 9 depends on Phase 8 being complete
- Phase 9 fixes type errors introduced during tRPC migration (Phases 1-7)

---

## Notes

- Some schema updates may require updating the route handlers if they return transformed data (not raw DB rows)
- The Judge relation update is complex — verify that `listFestivalJudgesWithAssignments` returns the exact shape the new schema expects
- Payment schema update may affect `useSuperAdminPayments` and `useFestivalPayment` hooks
- Test the payment flow end-to-end after schema updates
