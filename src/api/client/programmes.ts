import { useQuery } from "@tanstack/react-query";
import type {
  CreateProgrammeInput,
  Programme,
  UpdateProgrammeInput,
} from "@/api/contracts/programmes";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
import { queryKeys } from "./_query-keys";

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
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
  });
}

export const useCreateProgramme = createCreateMutation<
  Programme,
  { festivalId: string; data: CreateProgrammeInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.programmes.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<Programme>>(
      `/programmes?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    name: data.name,
    categoryId: data.categoryId,
    type: data.type,
    stageType: data.stageType,
    maxParticipantsPerGroup: data.maxParticipantsPerGroup ?? 1,
    maxTeamsPerGroup: data.maxTeamsPerGroup ?? 1,
    maxStudentsPerTeam: data.maxStudentsPerTeam ?? 1,
    maxPoints: data.maxPoints ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
});

export const useUpdateProgramme = createUpdateMutation<
  Programme,
  { festivalId: string; programmeId: string; data: UpdateProgrammeInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.programmes.all(festivalId),
  mutationFn: async ({ festivalId, programmeId, data }) => {
    const response = await apiClient.put<ApiResponse<Programme>>(
      `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
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

export const useDeleteProgramme = createDeleteMutation<
  Programme,
  { festivalId: string; programmeId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.programmes.all(festivalId),
  mutationFn: async ({ festivalId, programmeId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ programmeId }) => programmeId,
});
