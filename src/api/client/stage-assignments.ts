import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AssignStageManagerInput,
  StageManagerAssignment,
} from "@/api/contracts/stage-assignments";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useStageAssignments(festivalId: string) {
  return useQuery<StageManagerAssignment[]>({
    queryKey: queryKeys.stageAssignments.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<
        ApiResponse<StageManagerAssignment[]>
      >(`/stage-assignments?festivalId=${encodeURIComponent(festivalId)}`);
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useAssignStageManager() {
  const qc = useQueryClient();
  return useMutation<
    StageManagerAssignment,
    Error,
    { festivalId: string; data: AssignStageManagerInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<
        ApiResponse<StageManagerAssignment>
      >(`/stage-assignments?festivalId=${encodeURIComponent(festivalId)}`, {
        data,
      });
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.stageAssignments.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnassignStageManager() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; assignmentId: string }>(
    {
      mutationFn: async ({ festivalId, assignmentId }) => {
        const response = await apiClient.delete<ApiResponse<void>>(
          `/stage-assignments/${assignmentId}?festivalId=${encodeURIComponent(festivalId)}`,
        );
        return handleApiResponse(response.data);
      },
      onSuccess: (_data, { festivalId }) => {
        qc.invalidateQueries({
          queryKey: queryKeys.stageAssignments.all(festivalId),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
