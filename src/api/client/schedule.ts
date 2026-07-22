import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateScheduleEntryInput,
  ScheduleEntry,
  UpdateScheduleEntryInput,
} from "@/api/contracts/schedule";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
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
    staleTime: STALE_TIME.standard,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateScheduleItem() {
  const qc = useQueryClient();
  return useMutation<
    ScheduleEntry,
    Error,
    { festivalId: string; data: CreateScheduleEntryInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<ScheduleEntry>>(
        `/schedule?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedule.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateScheduleItem() {
  const qc = useQueryClient();
  return useMutation<
    ScheduleEntry,
    Error,
    { festivalId: string; entryId: string; data: UpdateScheduleEntryInput }
  >({
    mutationFn: async ({ festivalId, entryId, data }) => {
      const response = await apiClient.put<ApiResponse<ScheduleEntry>>(
        `/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedule.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteScheduleItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; entryId: string }>({
    mutationFn: async ({ festivalId, entryId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedule.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
