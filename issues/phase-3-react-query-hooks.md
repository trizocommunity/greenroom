# Phase 3: React Query Hooks

**Status:** ✅ DONE

## Goal

Create `src/api/client/[domain].ts` files with typed React Query hooks for all 22 domains. These hooks use `fetch` to call the new route handlers and import types from contracts.

## Hook Files to Create (21)

> Note: cron does not need client hooks — it's only called by external systems.

| # | File | Hooks |
|---|------|-------|
| 1 | `src/api/client/auth.ts` | useLogin, useRegister, useLogout, useMe |
| 2 | `src/api/client/festivals.ts` | useFestivals, useFestival, useCreateFestival, useUpdateFestival, useDeleteFestival |
| 3 | `src/api/client/students.ts` | useStudents, useStudent, useCreateStudent, useUpdateStudent, useDeleteStudent, useBulkCreateStudents, useExportExcelStudents, useValidateStudents |
| 4 | `src/api/client/groups.ts` | useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup |
| 5 | `src/api/client/categories.ts` | useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory |
| 6 | `src/api/client/assignments.ts` | useAssignments, useCreateAssignment, useDeleteAssignment, useUpdateAssignment, useBulkCreateAssignments |
| 7 | `src/api/client/programmes.ts` | useProgrammes, useProgramme, useCreateProgramme, useUpdateProgramme, useDeleteProgramme |
| 8 | `src/api/client/judges.ts` | useJudges, useCreateJudge, useUpdateJudge, useDeleteJudge |
| 9 | `src/api/client/members.ts` | useMembers, useAddMember, useRemoveMember |
| 10 | `src/api/client/stages.ts` | useStages, useCreateStage, useUpdateStage, useDeleteStage |
| 11 | `src/api/client/schedule.ts` | useSchedule, useCreateScheduleItem, useUpdateScheduleItem, useDeleteScheduleItem |
| 12 | `src/api/client/results.ts` | useResults, useSaveResult, usePublishResults, useUnpublishResults |
| 13 | `src/api/client/notifications.ts` | useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead |
| 14 | `src/api/client/payments.ts` | usePaymentStatus, useInitiatePayment, useVerifyPayment, usePaymentHistory |
| 15 | `src/api/client/billing.ts` | useUnusedCredit |
| 16 | `src/api/client/gallery.ts` | useGallery, useCreateGalleryItem, useDeleteGalleryItem |
| 17 | `src/api/client/news.ts` | useNews, useCreateNews, useUpdateNews, useDeleteNews |
| 18 | `src/api/client/upload.ts` | useUploadFile, useDeleteFile |
| 19 | `src/api/client/profile.ts` | useProfile, useUpdateProfile |
| 20 | `src/api/client/my-festival.ts` | useMyFestivals, useJoinedFestivals |
| 21 | `src/api/client/team-leader.ts` | useTeamLeaderFestivals, useTeamLeaderDashboard, useTeamLeaderStudents |

## Query Hook Pattern

```typescript
// src/api/client/festivals.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Festival, CreateFestivalInput, UpdateFestivalInput } from "@/api/contracts/festivals";

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

export function useFestival(id: string) {
  return useQuery<Festival>({
    queryKey: ["festivals", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/festivals/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}
```

## Mutation Hook Pattern

```typescript
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festivals"] });
    },
  });
}

export function useDeleteFestival() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/festivals/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festivals"] });
    },
  });
}
```

## Optimistic Update Pattern

```typescript
export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; studentId: string }>({
    mutationFn: async ({ studentId }) => {
      const res = await fetch(`${API_BASE}/students/${studentId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
    },
    onMutate: async ({ festivalId, studentId }) => {
      await qc.cancelQueries({ queryKey: ["students", festivalId] });
      const prev = qc.getQueryData(["students", festivalId]);
      qc.setQueryData(["students", festivalId], (old: any[]) =>
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

## Query Client Config

The `makeQueryClient()` from Phase 0 is already configured with:
- `staleTime: 30 * 1000`
- `gcTime: 5 * 60 * 1000`
- `refetchOnWindowFocus: false`
- Custom retry logic (no retry for 401/403/404)
- Exponential backoff retry delay

## Verification

- [ ] All 21 hook files created
- [ ] All hooks use types from contracts
- [ ] Mutations include cache invalidation
- [ ] `npm run lint` — zero warnings
