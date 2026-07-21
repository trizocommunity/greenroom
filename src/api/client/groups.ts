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
import { STALE_TIME } from "@/lib/query-utils";

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
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<
    Group,
    Error,
    { festivalId: string; data: CreateGroupInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Group>>(
        `/groups?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation<
    Group,
    Error,
    { festivalId: string; groupId: string; data: UpdateGroupInput }
  >({
    mutationFn: async ({ festivalId, groupId, data }) => {
      const response = await apiClient.put<ApiResponse<Group>>(
        `/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: ({ festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; groupId: string }>({
    mutationFn: async ({ festivalId, groupId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
