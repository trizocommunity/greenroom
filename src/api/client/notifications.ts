import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type {
  MarkAllReadInput,
  MarkReadInput,
  Notification,
} from "@/api/contracts/notifications";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useNotifications(participantId: string) {
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications.all(participantId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Notification[]>>(
        `/notifications?participantId=${encodeURIComponent(participantId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!participantId,
    staleTime: STALE_TIME.fast,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, MarkReadInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/notifications/mark-read",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { participantId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.notifications.all(participantId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, MarkAllReadInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/notifications/mark-all-read",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { participantId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.notifications.all(participantId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
