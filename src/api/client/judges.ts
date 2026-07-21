import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Judge, JudgeInput } from "@/api/contracts/judges";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

export function useJudges(festivalId: string) {
  return useQuery<Judge[]>({
    queryKey: queryKeys.judges.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Judge[]>>(
        `/judges?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateJudge() {
  const qc = useQueryClient();
  return useMutation<Judge, Error, { festivalId: string; data: JudgeInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Judge>>(
        `/judges?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.judges.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateJudge() {
  const qc = useQueryClient();
  return useMutation<Judge, Error, { festivalId: string; judgeId: string; data: JudgeInput }>({
    mutationFn: async ({ festivalId, judgeId, data }) => {
      const response = await apiClient.put<ApiResponse<Judge>>(
        `/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.judges.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteJudge() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; judgeId: string }>({
    mutationFn: async ({ festivalId, judgeId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.judges.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
