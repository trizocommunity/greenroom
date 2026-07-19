import { useQuery } from "@tanstack/react-query";
import type { Stage, StageDataInput } from "@/api/contracts/stages";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
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
    staleTime: 30 * 1000,
  });
}

export const useCreateStage = createCreateMutation<
  Stage,
  { festivalId: string; data: StageDataInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.stages.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<Stage>>(
      `/stages?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    name: data.name,
    description: data.description ?? null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
});

export const useUpdateStage = createUpdateMutation<
  Stage,
  { festivalId: string; stageId: string; data: StageDataInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.stages.all(festivalId),
  mutationFn: async ({ festivalId, stageId, data }) => {
    const response = await apiClient.put<ApiResponse<Stage>>(
      `/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
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

export const useDeleteStage = createDeleteMutation<
  Stage,
  { festivalId: string; stageId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.stages.all(festivalId),
  mutationFn: async ({ festivalId, stageId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ stageId }) => stageId,
});
