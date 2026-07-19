import { useQuery } from "@tanstack/react-query";
import type { Judge, JudgeInput } from "@/api/contracts/judges";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
import { queryKeys } from "./_query-keys";

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
    staleTime: 30 * 1000,
  });
}

export const useCreateJudge = createCreateMutation<
  Judge,
  { festivalId: string; data: JudgeInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.judges.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<Judge>>(
      `/judges?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    name: data.name,
    description: data.description ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
});

export const useUpdateJudge = createUpdateMutation<
  Judge,
  { festivalId: string; judgeId: string; data: JudgeInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.judges.all(festivalId),
  mutationFn: async ({ festivalId, judgeId, data }) => {
    const response = await apiClient.put<ApiResponse<Judge>>(
      `/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
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

export const useDeleteJudge = createDeleteMutation<
  Judge,
  { festivalId: string; judgeId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.judges.all(festivalId),
  mutationFn: async ({ festivalId, judgeId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ judgeId }) => judgeId,
});
