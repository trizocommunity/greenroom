import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStudentProgrammeNotificationsAction,
  markAllStudentProgrammeNotificationsReadAction,
  markStudentProgrammeNotificationReadAction,
} from "@/server/actions/programme-reporting.actions";

const REFETCH_INTERVAL_MS = 15000;

export function useProgrammeNotifications(studentId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["programme-notifications", studentId],
    queryFn: () => getStudentProgrammeNotificationsAction(studentId),
    enabled: Boolean(studentId),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  useEffect(() => {
    if (!studentId) return;
    const streamUrl = `/api/realtime/notifications?studentId=${encodeURIComponent(studentId)}`;
    const es = new EventSource(streamUrl);
    es.onmessage = () => {
      void queryClient.invalidateQueries({
        queryKey: ["programme-notifications", studentId],
      });
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [queryClient, studentId]);

  const markOne = useMutation({
    mutationFn: (notificationId: string) =>
      markStudentProgrammeNotificationReadAction(studentId, notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["programme-notifications", studentId],
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllStudentProgrammeNotificationsReadAction(studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["programme-notifications", studentId],
      });
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markOneRead: (id: string) => markOne.mutate(id),
    markAllRead: () => markAll.mutate(),
  };
}
