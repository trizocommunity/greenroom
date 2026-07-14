import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MarkAllReadInput,
  MarkReadInput,
  Notification,
} from "@/api/contracts/notifications";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useNotifications(studentId: string) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", studentId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/notifications?studentId=${encodeURIComponent(studentId)}`,
      );
      return handleResponse<Notification[]>(res);
    },
    enabled: !!studentId,
    staleTime: 30 * 1000,
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
      const res = await fetch(`${API_BASE}/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<void>(res);
    },
    onMutate: async ({ studentId, notificationId }) => {
      await qc.cancelQueries({ queryKey: ["notifications", studentId] });
      const prev = qc.getQueryData<Notification[]>(["notifications", studentId]);
      qc.setQueryData(
        ["notifications", studentId],
        (old: Notification[] | undefined) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
      );
      return { prev };
    },
    onError: (_err, { studentId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["notifications", studentId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { studentId }) => {
      qc.invalidateQueries({ queryKey: ["notifications", studentId] });
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
      const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<void>(res);
    },
    onMutate: async ({ studentId }) => {
      await qc.cancelQueries({ queryKey: ["notifications", studentId] });
      const prev = qc.getQueryData<Notification[]>(["notifications", studentId]);
      qc.setQueryData(
        ["notifications", studentId],
        (old: Notification[] | undefined) =>
          old?.map((n) => ({ ...n, isRead: true })),
      );
      return { prev };
    },
    onError: (_err, { studentId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["notifications", studentId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { studentId }) => {
      qc.invalidateQueries({ queryKey: ["notifications", studentId] });
    },
  });
}
