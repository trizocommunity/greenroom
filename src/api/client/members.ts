import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AddMemberInput, Member } from "@/api/contracts/members";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
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
    staleTime: 30 * 1000,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation<
    Member,
    Error,
    { festivalId: string; data: AddMemberInput },
    { prev: Member[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Member>>(
        `/members?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.members.all(festivalId) });
      const prev = qc.getQueryData<Member[]>(queryKeys.members.all(festivalId));
      const tempMember: Member = {
        id: `temp-${Date.now()}`,
        ...data,
        festivalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Member;
      qc.setQueryData<Member[]>(queryKeys.members.all(festivalId), (old) => [
        ...(old || []),
        tempMember,
      ]);
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.members.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.members.all(festivalId),
      });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; memberId: string },
    { prev: Member[] | undefined }
  >({
    mutationFn: async ({ festivalId, memberId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/members?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { memberId } },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, memberId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.members.all(festivalId) });
      const prev = qc.getQueryData<Member[]>(queryKeys.members.all(festivalId));
      qc.setQueryData<Member[]>(queryKeys.members.all(festivalId), (old) =>
        (old || []).filter((m) => m.id !== memberId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.members.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.members.all(festivalId),
      });
    },
  });
}
