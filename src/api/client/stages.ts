import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Stage, StageDataInput } from "@/api/contracts/stages";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useStages(festivalId: string) {
  return useQuery<Stage[]>({
    queryKey: queryKeys.stages.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Stage[]>>(
        `/stages?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation<
    Stage,
    Error,
    { festivalId: string; data: StageDataInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Stage>>(
        `/stages?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.stages.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation<
    Stage,
    Error,
    { festivalId: string; stageId: string; data: StageDataInput }
  >({
    mutationFn: async ({ festivalId, stageId, data }) => {
      const response = await apiClient.put<ApiResponse<Stage>>(
        `/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.stages.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; stageId: string }>({
    mutationFn: async ({ festivalId, stageId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.stages.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
