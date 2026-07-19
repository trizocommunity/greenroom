# issue-07: Tanstack Query & Axios Industry Standards Implementation

**Status:** COMPLETED

## Clarified Decisions (vs original spec)

- **Query keys path**: `src/api/client/_query-keys.ts` (not `src/core/http/query-keys.ts`)
- **Axios**: Already installed at `^1.13.2` - skip installation, just configure
- **Auth pattern**: HTTP-only cookie session → use `withCredentials: true` (NOT Bearer token)
- **New api-client.ts**: Replaces existing `src/lib/api-client.ts`
- **Part C hook location**: `src/api/client/*.ts` (centralized API layer)
- **DevTools package**: `@tanstack/react-query-devtools` needs installation

---

## TL;DR

Migrate from raw `fetch` to **Axios** + implement all Tanstack Query industry standards: query key factories, awaited invalidations, toast errors, optimistic updates, DevTools, and type-safe patterns. Affects **42 existing files** + **23 files missing Tanstack Query**.

---

## Part A: Axios Migration

### A-1: Install & Configure Axios

| Step | Description | File |
|------|-------------|------|
| A-1.1 | Install `@tanstack/react-query-devtools` | `package.json` |
| A-1.2 | Create `src/lib/api-client.ts` with Axios instance | `src/lib/api-client.ts` |
| A-1.3 | Configure interceptors: auth headers, 401 redirect, error handling | `src/lib/api-client.ts` |
| A-1.4 | Replace all `fetch` calls in API clients | `src/api/client/*.ts` |

**Note**: `axios` is already installed at `^1.13.2` - skip A-1.1 for axios.

**Axios Instance Config:**
```typescript
// src/lib/api-client.ts
export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  withCredentials: true,  // sends HTTP-only cookie automatically
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      redirectToLogin(); // or useRouter
    }
    return Promise.reject(error);
  }
);
```

---

### A-2: Remove handleResponse Wrapper

| Step | Description | File |
|------|-------------|------|
| A-2.1 | Delete `handleResponse` function | `src/api/client/festivals.ts` (and 24 others) |
| A-2.2 | Use `apiClient.get/post/put/delete` directly | `src/api/client/*.ts` |

---

## Part B: Tanstack Query Industry Standards

### B-1: Await All `invalidateQueries` (0% current compliance)

| Step | Description | Files |
|------|-------------|-------|
| B-1.1 | Add `return` before all `invalidateQueries` calls | All mutation files in `src/api/client/` |

**Before:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['students'] })
}
```

**After:**
```typescript
onSuccess: () => {
  return queryClient.invalidateQueries({ queryKey: ['students'] })
}
```

**Files:** 40 mutations across 20 files

---

### B-2: Add Toast Errors to Mutations (80% missing)

| Step | Description | Files |
|------|-------------|------|
| B-2.1 | Add `toast.error(error.message)` in `onError` | See list below |

**Files needing toast errors:**
- `src/api/client/upload.ts` (2 mutations: `useUploadFile`, `useDeleteFile`)
- `src/api/client/team-leader.ts` (3 mutations: `useRequestOtp`, `useVerifyOtp`, `useTeamLeaderLogout`)
- `src/api/client/students.ts` (3 mutations: `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent`)
- `src/api/client/stages.ts` (3 mutations)
- `src/api/client/schedule.ts` (3 mutations)
- `src/api/client/results.ts` (2 mutations: `useSaveResult`, `usePublishResults`, `useUnpublishResults`)
- `src/api/client/programmes.ts` (3 mutations)
- `src/api/client/notifications.ts` (2 mutations)
- `src/api/client/judges.ts` (3 mutations)
- `src/api/client/groups.ts` (3 mutations)
- `src/api/client/categories.ts` (3 mutations)
- `src/api/client/assignments.ts` (4 mutations)
- `src/api/client/festivals.ts` (3 mutations)
- `src/api/client/members.ts` (2 mutations)
- `src/api/client/gallery.ts` (2 mutations)
- `src/api/client/auth.ts` (1 mutation)
- `src/api/client/profile.ts` (2 mutations)
- `src/api/client/payments.ts` (2 mutations: `useInitiatePayment`, `useVerifyPayment`)
- `src/api/client/news.ts` (3 mutations)
- `src/api/client/results.ts` (3 mutations)
- `src/features/auth/hooks/use-users.ts` (2 mutations)

**Total: 51 mutations need toast errors**

---

### B-3: Add Optimistic Updates (60% missing)

| Step | Description | Files |
|------|-------------|------|
| B-3.1 | Add `onMutate` + `onError` rollback for create mutations | `festivals.ts`, `news.ts`, `members.ts`, `gallery.ts`, `assignments.ts` |
| B-3.2 | Add `onMutate` + `onError` rollback for update mutations | `profile.ts`, `festivals.ts`, `results.ts` |
| B-3.3 | Add `onMutate` + `onError` rollback for delete mutations | `news.ts`, `members.ts`, `gallery.ts`, `assignments.ts` |

---

### B-4: Centralize Query Key Factory

| Step | Description | File |
|------|-------------|------|
| B-4.1 | Use `queryKeys` from `src/api/client/_query-keys.ts` in all API clients | `src/api/client/*.ts` |
| B-4.2 | Replace hardcoded `['resource', id]` with `queryKeys.resource.detail(id)` | All 25 API client files |

**Current (hardcoded):**
```typescript
queryKey: ['students', festivalId]
```

**After:**
```typescript
queryKey: queryKeys.students.list(festivalId)
```

---

### B-5: Add React Query DevTools

| Step | Description | File |
|------|-------------|------|
| B-5.1 | Install `@tanstack/react-query-devtools` | `package.json` |
| B-5.2 | Import DevTools in QueryProvider | `src/components/providers/QueryProvider.tsx` |
| B-5.3 | Add `<ReactQueryDevtools />` to provider | `src/components/providers/QueryProvider.tsx` |

---

### B-6: Add Loading/Error State Handling

| Step | Description | Files |
|------|-------------|-------|
| B-6.1 | Check `isLoading` in components | All components using queries |
| B-6.2 | Check `isError` + render error UI | All components using queries |

**COMPLETED - Components updated:**
- `AppSidebar.tsx` - Added isLoading skeleton + isError handling
- `Navbar.tsx` - Added isLoading skeleton + isError handling
- `NewsClient.tsx` - Added isLoading skeleton + isError handling
- `AssignmentModal.tsx` - Added isLoading skeleton
- `AssignTeamLeadersModal.tsx` - Added isLoading skeleton
- `BillingTab.tsx` - Added isError handling
- `PaymentHistoryTab.tsx` - Added isError handling
- `ProgrammeNotificationsClient.tsx` - Added isError handling
- `FestivalsTable.tsx` - Added isError handling
- `MembersClient.tsx` - Added isError handling

---

## Part C: Wrap Server Actions in Tanstack Query

### C-1: Components Missing useMutation

| # | File | Server Actions to Wrap | Lines |
|---|------|----------------------|-------|
| C-1.1 | `ExternalJudgeClient.tsx` | `verifyJudgmentLinkPinAction`, `submitJudgeScoresAction`, `submitGroupJudgeScoresAction` | 833, 959, 980 |
| C-1.2 | `BasicScoringClient.tsx` | `saveBasicProgrammeScoresAction` | 240 |
| C-1.3 | `ResultsManagementClient.tsx` | `createProgrammeJudgeLinkAction`, `reopenProgrammeReportingByProgrammeAction` | 693, 771 |
| C-1.4 | `JudgmentWizardClient.tsx` | `createJudgmentConfigurationAction`, `regenerateJudgmentConfigurationLinkAction` | 418, 450 |
| C-1.5 | `ScoringPolicyClient.tsx` | `saveScoringPolicyAction` | 588 |
| C-1.6 | `ScheduleClient.tsx` | `reorderScheduleEntries` | 297 |
| C-1.7 | `SessionScheduleClient.tsx` | `deleteScheduleEntry` | 249 |
| C-1.8 | `VisualIdentityDialog.tsx` | `updateFestivalBrandingAction` | 105 |
| C-1.9 | `DeadlinesDialog.tsx` | `updateFestivalSettingsAction` | 66 |
| C-1.10 | `TeamResultsDialog.tsx` | `updateFestivalSettingsAction` | 58 |
| C-1.11 | `AdvancedSettingsDialog.tsx` | `updateFestivalSettingsAction` | 59 |
| C-1.12 | `DesignTemplatesClient.tsx` | `unpublishPosterTemplateAction`, `deletePosterTemplateDraftAction`, `clearAllPosterTemplatesAction` | 109, 124, 174 |
| C-1.13 | `FestivalPosterEditor.tsx` | `savePosterTemplateDraftAction`, `publishPosterTemplateAction` | 210, 275 |
| C-1.14 | `BulkUploadProgrammesModal.tsx` | `bulkCreateProgrammesAction` | 476 |
| C-1.15 | `QrScanner.tsx` | `scanAndReportStudentAction` | 354 |
| C-1.16 | `QrCodesClient.tsx` | `exportStudentsQrPdfAction` | 271 |
| C-1.17 | `ProgrammeReportingClient.tsx` | 9 actions (assignCodeLettersWithSpin, startProgrammeReporting, reset, close, reopen, markParticipant, etc.) | 852, 925, 938, 956, 1022, 1053, 1083, 1130, 1515 |
| C-1.18 | `AssignmentsClient.tsx` | `deleteTeamAssignmentAction` | 742 |
| C-1.19 | `StudentDialog.tsx` | `validateStudentsAction` | 145 |
| C-1.20 | `ContactForm.tsx` | Create API mutation for contact form | 13-18 |

---

### C-2: Components Missing useQuery

| # | File | Actions to Query | Lines |
|---|------|------------------|-------|
| C-2.1 | `DesignTemplatesClient.tsx` | `listPosterTemplatesAction` | 102 |
| C-2.2 | `FestivalPosterEditor.tsx` | `getPosterTemplateAction`, `getEditorPreviewBindingsAction` | 165, 197 |
| C-2.3 | `usePublishProgrammeWithPoster.tsx` | `getPublishedResultTemplatesAction` | 49 |
| C-2.4 | `ProgrammeReportingClient.tsx` | `getReportingStatsAction` | 818 |
| C-2.5 | `StudentDetailsDialog.tsx` | `getProgrammeTeamMembersAction` | 94 |
| C-2.6 | `StudentProfileView.tsx` | `getProgrammeTeamMembersAction` | 108 |
| C-2.7 | `ExternalJudgeClient.tsx` | `previewJudgeSubmissionSummaryAction` | 921 |

---

## Part D: Type Safety Improvements

| Step | Description | Files |
|------|-------------|-------|
| D-1 | Fix `unknown` return types in `team-leader.ts` | `src/api/client/team-leader.ts` |
| D-2 | Add proper types to `use-current-user.ts` | `src/features/auth/hooks/use-current-user.ts` |
| D-3 | Add proper types to `use-invitations.ts` | `src/features/invitation/hooks/use-invitations.ts` |

---

## Sub-task Summary

| Part | # | Description | Files | Effort |
|------|---|-------------|-------|--------|
| **A** | A-1 | Install axios + create api-client.ts | 1 | Medium |
| **A** | A-2 | Replace fetch with axios | 25 | High |
| **B** | B-1 | Await invalidateQueries | 40 mutations | Low |
| **B** | B-2 | Add toast errors | 51 mutations | Low |
| **B** | B-3 | Add optimistic updates | 16 mutations | Medium |
| **B** | B-4 | Use queryKeys factory | 25 | Medium |
| **B** | B-5 | Add DevTools | 1 | Low |
| **B** | B-6 | Loading/error states | 13 | Medium |
| **C** | C-1 | Wrap server actions in useMutation | 20 files | High |
| **C** | C-2 | Wrap server actions in useQuery | 7 files | Medium |
| **D** | D-1 | Fix unknown types | 3 files | Low |

---

## Dependencies

- Part A must complete before B-1 through B-6
- Part C depends on Part B (invalidation patterns)
- Part D is independent but recommended

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Toast errors | 20% | 100% |
| Awaited invalidations | 0% | 100% |
| Optimistic updates | 40% | 100% |
| Query key factory usage | 4 files | 29 files |
| DevTools | Not installed | Installed |
| Server actions wrapped | 0% | 100% |
| Loading/error state handling | 0% | 100% |
