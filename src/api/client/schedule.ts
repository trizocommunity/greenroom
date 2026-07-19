import { useQuery } from "@tanstack/react-query";
import type {
  CreateScheduleEntryInput,
  ScheduleEntry,
  UpdateScheduleEntryInput,
} from "@/api/contracts/schedule";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
import { queryKeys } from "./_query-keys";

export function useSchedule(
  festivalId: string,
  typeFilter?: "PROGRAMME" | "SESSION",
) {
  return useQuery<ScheduleEntry[]>({
    queryKey: queryKeys.schedule.all(festivalId, typeFilter),
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (typeFilter) params.set("typeFilter", typeFilter);
      const response = await apiClient.get<ApiResponse<ScheduleEntry[]>>(
        `/schedule?${params}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export const useCreateScheduleItem = createCreateMutation<
  ScheduleEntry,
  { festivalId: string; data: CreateScheduleEntryInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.schedule.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<ScheduleEntry>>(
      `/schedule?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    type: data.type,
    programmeId: data.programmeId ?? null,
    stageId: data.stageId ?? null,
    title: data.title ?? null,
    description: data.description ?? null,
    speakers: data.speakers ?? null,
    sessionType: data.sessionType ?? null,
    startTime: data.startTime,
    endTime: data.endTime ?? null,
    order: data.order ?? 0,
    scheduleDayKey: data.scheduleDayKey ?? null,
    createdBy: null,
    updatedBy: null,
    updatedAt: new Date().toISOString(),
  }),
});

export const useUpdateScheduleItem = createUpdateMutation<
  ScheduleEntry,
  { festivalId: string; entryId: string; data: UpdateScheduleEntryInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.schedule.all(festivalId),
  mutationFn: async ({ festivalId, entryId, data }) => {
    const response = await apiClient.put<ApiResponse<ScheduleEntry>>(
      `/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  updateOptimisticItem: (item, { data }) => ({
    ...item,
    ...data,
    updatedAt: new Date().toISOString(),
  }),
  getItemId: (item) => item.id,
});

export const useDeleteScheduleItem = createDeleteMutation<
  ScheduleEntry,
  { festivalId: string; entryId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.schedule.all(festivalId),
  mutationFn: async ({ festivalId, entryId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ entryId }) => entryId,
});
