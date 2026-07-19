import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateGroupInput,
  Group,
  UpdateGroupInput,
} from "@/api/contracts/groups";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export function useGroups(festivalId: string) {
  return useQuery<Group[]>({
    queryKey: queryKeys.groups.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Group[]>>(
        `/groups?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<
    Group,
    Error,
    { festivalId: string; data: CreateGroupInput },
    { prev: Group[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Group>>(
        `/groups?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all(festivalId) });
      const prev = qc.getQueryData<Group[]>(queryKeys.groups.all(festivalId));
      const tempId = `temp-${Date.now()}`;
      const optimisticGroup: Group = {
        id: tempId,
        festivalId,
        name: data.name,
        seriesStart: data.seriesStart ?? null,
        color: data.color ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<Group[]>(queryKeys.groups.all(festivalId), (old) =>
        old ? [...old, optimisticGroup] : [optimisticGroup],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.groups.all(festivalId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.groups.all(festivalId),
      });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation<
    Group,
    Error,
    { festivalId: string; groupId: string; data: UpdateGroupInput },
    { prev: Group[] | undefined }
  >({
    mutationFn: async ({ festivalId, groupId, data }) => {
      const response = await apiClient.put<ApiResponse<Group>>(
        `/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, groupId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all(festivalId) });
      const prev = qc.getQueryData<Group[]>(queryKeys.groups.all(festivalId));
      qc.setQueryData<Group[]>(queryKeys.groups.all(festivalId), (old) =>
        old?.map((g) =>
          g.id === groupId
            ? {
                ...g,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : g,
        ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.groups.all(festivalId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.groups.all(festivalId),
      });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; groupId: string },
    { prev: Group[] | undefined }
  >({
    mutationFn: async ({ festivalId, groupId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, groupId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all(festivalId) });
      const prev = qc.getQueryData<Group[]>(queryKeys.groups.all(festivalId));
      qc.setQueryData(
        queryKeys.groups.all(festivalId),
        (old: Group[] | undefined) => old?.filter((g) => g.id !== groupId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.groups.all(festivalId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.groups.all(festivalId),
      });
    },
  });
}
