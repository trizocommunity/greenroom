import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFestivalInput,
  Festival,
  UpdateFestivalInput,
} from "@/api/contracts/festivals";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

export type { Festival };

export function useFestivals() {
  return useQuery<Festival[]>({
    queryKey: queryKeys.festivals.all,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<Festival[]>>("/festivals");
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useFestival(id: string) {
  return useQuery<Festival>({
    queryKey: queryKeys.festivals.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Festival>>(
        `/festivals/${id}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!id,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateFestival() {
  const qc = useQueryClient();
  return useMutation<Festival, Error, CreateFestivalInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<Festival>>(
        "/festivals",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}

export function useUpdateFestival(id: string) {
  const qc = useQueryClient();
  return useMutation<Festival, Error, UpdateFestivalInput>({
    mutationFn: async (data) => {
      const response = await apiClient.put<ApiResponse<Festival>>(
        "/festivals",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.festivals.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}

export function useDeleteFestival() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/festivals/${id}`,
        {
          data: reason ? { reason } : undefined,
        },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.festivals.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}
