import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AddMemberInput, Member } from "@/api/contracts/members";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useMembers(festivalId: string) {
  return useQuery<Member[]>({
    queryKey: queryKeys.members.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Member[]>>(
        `/members?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation<
    Member,
    Error,
    { festivalId: string; data: AddMemberInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Member>>(
        `/members?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.members.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; memberId: string }>({
    mutationFn: async ({ festivalId, memberId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/members?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { memberId } },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.members.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
