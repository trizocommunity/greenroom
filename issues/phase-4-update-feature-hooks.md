# Phase 4: Update Feature Hook Usages

**Status:** ✅ DONE

## Goal

Replace all imports of old tRPC hooks from `src/features/*/hooks/use-*.ts` with the new hooks from `src/api/client/`. Then delete the old hook files.

## Import Changes Required

### Pattern

```typescript
// BEFORE (tRPC)
import { useFestivals, useCreateFestival } from "@/features/festivals/hooks/use-festivals";
import { useTRPC } from "@/trpc/client";

// AFTER (Route Handlers)
import { useFestivals, useCreateFestival } from "@/api/client/festivals";
```

## Files to Update

### festivals
- `src/features/festivals/**/*.tsx` — replace `useFestivals`, `useCreateFestival`, etc.

### students
- `src/features/students/**/*.tsx` — replace `useStudents`, `useCreateStudent`, etc.

### groups
- `src/features/groups/**/*.tsx` — replace `useGroups`, `useCreateGroup`, etc.

### categories
- `src/features/categories/**/*.tsx` — replace `useCategories`, etc.

### assignments
- `src/features/assignments/**/*.tsx` — replace `useAssignments`, etc.

### programmes
- `src/features/programmes/**/*.tsx` — replace `useProgrammes`, etc.

### judges
- `src/features/judges/**/*.tsx` — replace `useJudges`, etc.

### members
- `src/features/members/**/*.tsx` — replace `useMembers`, etc.

### stages
- `src/features/stages/**/*.tsx` — replace `useStages`, etc.

### schedule
- `src/features/schedule/**/*.tsx` — replace `useSchedule`, etc.

### results
- `src/features/results/**/*.tsx` — replace `useResults`, etc.

### notifications
- `src/features/notifications/**/*.tsx` — replace `useNotifications`, etc.

### payments
- `src/features/payments/**/*.tsx` — replace `usePaymentStatus`, `usePaymentHistory`, `useFestivalPayment`, etc.

### billing
- `src/features/billing/**/*.tsx` — replace `useUnusedCredit`, etc.

### users (super-admin)
- `src/features/users/**/*.tsx` — replace `useUsers`, `useSuperAdminPayments`, etc.

## Hooks to Delete After Migration

```
src/features/festivals/hooks/use-festivals.ts
src/features/festivals/hooks/use-current-user.ts
src/features/festivals/hooks/use-joined-festivals.ts
src/features/festivals/hooks/use-my-festival.ts
src/features/students/hooks/use-students.ts
src/features/groups/hooks/use-groups.ts
src/features/categories/hooks/use-categories.ts
src/features/assignments/hooks/use-assignments.ts
src/features/programmes/hooks/use-programmes.ts
src/features/judges/hooks/use-judges.ts
src/features/members/hooks/use-members.ts
src/features/stages/hooks/use-stages.ts
src/features/schedule/hooks/use-schedule.ts
src/features/results/hooks/use-results.ts
src/features/notifications/hooks/use-programme-notifications.ts
src/features/payments/hooks/use-payment-status.ts
src/features/payments/hooks/use-payment-history.ts
src/features/payments/hooks/use-festival-payment.ts
src/features/billing/hooks/use-unused-credit.ts
src/features/users/hooks/use-users.ts
src/features/users/hooks/use-super-admin-payments.ts
```

## Approach

1. Grep for all files importing from `src/features/*/hooks/`
2. For each file, update the import to point to `src/api/client/`
3. Remove the `useTRPC` import (no longer needed)
4. Delete the old hook files

## Verification

- [ ] All feature files updated to use new hooks
- [ ] All old hook files deleted
- [ ] No remaining imports from `@/trpc/client`
- [ ] `npm run lint` — zero warnings
