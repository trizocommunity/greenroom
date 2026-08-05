import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignJudgeStageInput,
  JudgeStageAssignment,
} from "@/api/contracts/judge-stage-assignments";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export function useJudgeStageAssignments(festivalId: string) {
  return useQuery<JudgeStageAssignment[]>({
    queryKey: queryKeys.judgeStageAssignments.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<JudgeStageAssignment[]>>(
        `/judge-stage-assignments?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useAssignJudgeStage() {
  const qc = useQueryClient();
  return useMutation<
    JudgeStageAssignment,
    Error,
    { festivalId: string; data: AssignJudgeStageInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<JudgeStageAssignment>>(
        `/judge-stage-assignments?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.judgeStageAssignments.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnassignJudgeStage() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; assignmentId: string }>(
    {
      mutationFn: async ({ festivalId, assignmentId }) => {
        const response = await apiClient.delete<ApiResponse<void>>(
          `/judge-stage-assignments/${assignmentId}?festivalId=${encodeURIComponent(festivalId)}`,
        );
        return handleApiResponse(response.data);
      },
      onSuccess: (_data, { festivalId }) => {
        qc.invalidateQueries({
          queryKey: queryKeys.judgeStageAssignments.all(festivalId),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
