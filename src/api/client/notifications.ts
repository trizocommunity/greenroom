import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  MarkAllReadInput,
  MarkReadInput,
  Notification,
} from "@/api/contracts/notifications";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export function useNotifications(studentId: string) {
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications.all(studentId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Notification[]>>(
        `/notifications?studentId=${encodeURIComponent(studentId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!studentId,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    MarkReadInput,
    { prev: Notification[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/notifications/mark-read",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ studentId, notificationId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.notifications.all(studentId),
      });
      const prev = qc.getQueryData<Notification[]>(
        queryKeys.notifications.all(studentId),
      );
      qc.setQueryData(
        queryKeys.notifications.all(studentId),
        (old: Notification[] | undefined) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
      );
      return { prev };
    },
    onError: (error, { studentId }, ctx) => {
      toast.error(error.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.notifications.all(studentId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { studentId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.notifications.all(studentId),
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    MarkAllReadInput,
    { prev: Notification[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/notifications/mark-all-read",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ studentId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.notifications.all(studentId),
      });
      const prev = qc.getQueryData<Notification[]>(
        queryKeys.notifications.all(studentId),
      );
      qc.setQueryData(
        queryKeys.notifications.all(studentId),
        (old: Notification[] | undefined) =>
          old?.map((n) => ({ ...n, isRead: true })),
      );
      return { prev };
    },
    onError: (error, { studentId }, ctx) => {
      toast.error(error.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.notifications.all(studentId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { studentId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.notifications.all(studentId),
      });
    },
  });
}
