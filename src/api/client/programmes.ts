import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateProgrammeInput,
  Programme,
  UpdateProgrammeInput,
} from "@/api/contracts/programmes";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

export function useProgrammes(festivalId: string, categoryId?: string) {
  return useQuery<Programme[]>({
    queryKey: queryKeys.programmes.all(festivalId, categoryId),
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (categoryId) params.set("categoryId", categoryId);
      const response = await apiClient.get<ApiResponse<Programme[]>>(
        `/programmes?${params}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useProgramme(festivalId: string, programmeId: string) {
  return useQuery<Programme>({
    queryKey: queryKeys.programmes.detail(festivalId, programmeId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Programme>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId && !!programmeId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation<Programme, Error, { festivalId: string; data: CreateProgrammeInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Programme>>(
        `/programmes?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.programmes.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation<Programme, Error, { festivalId: string; programmeId: string; data: UpdateProgrammeInput }>({
    mutationFn: async ({ festivalId, programmeId, data }) => {
      const response = await apiClient.put<ApiResponse<Programme>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.programmes.detail(festivalId, programmeId) });
      qc.invalidateQueries({ queryKey: queryKeys.programmes.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; programmeId: string }>({
    mutationFn: async ({ festivalId, programmeId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.programmes.detail(festivalId, programmeId) });
      qc.invalidateQueries({ queryKey: queryKeys.programmes.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
