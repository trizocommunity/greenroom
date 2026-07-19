import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateFestivalInput,
  Festival,
  UpdateFestivalInput,
} from "@/api/contracts/festivals";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export type { Festival };

export function useFestivals() {
  return useQuery<Festival[]>({
    queryKey: queryKeys.festivals.all,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<Festival[]>>("/festivals");
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
  });
}

export function useCreateFestival() {
  const qc = useQueryClient();
  return useMutation<
    Festival,
    Error,
    CreateFestivalInput,
    { prev: Festival[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<Festival>>(
        "/festivals",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: queryKeys.festivals.all });
      const prev = qc.getQueryData<Festival[]>(queryKeys.festivals.all);
      qc.setQueryData<Festival[]>(queryKeys.festivals.all, (old) => [
        ...(old || []),
        {
          ...data,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Festival,
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.festivals.all, ctx.prev);
      }
      toast.error(_err.message);
    },
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}

export function useUpdateFestival() {
  const qc = useQueryClient();
  return useMutation<
    Festival,
    Error,
    UpdateFestivalInput,
    { prev: Festival[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.put<ApiResponse<Festival>>(
        "/festivals",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: queryKeys.festivals.all });
      const prev = qc.getQueryData<Festival[]>(queryKeys.festivals.all);
      qc.setQueryData<Festival[]>(queryKeys.festivals.all, (old) =>
        (old || []).map((f) => (f.id === data.id ? { ...f, ...data } : f)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.festivals.all, ctx.prev);
      }
      toast.error(_err.message);
    },
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}

export function useDeleteFestival() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; reason?: string },
    { prev: Festival[] | undefined }
  >({
    mutationFn: async ({ id, reason }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/festivals/${id}`,
        {
          data: reason ? { reason } : undefined,
        },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.festivals.all });
      const prev = qc.getQueryData<Festival[]>(queryKeys.festivals.all);
      qc.setQueryData<Festival[]>(queryKeys.festivals.all, (old) =>
        (old || []).filter((f) => f.id !== id),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.festivals.all, ctx.prev);
      }
      toast.error(_err.message);
    },
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: queryKeys.festivals.all });
    },
  });
}
