import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import {
  getStudentProgrammeNotificationsAction,
  markAllStudentProgrammeNotificationsReadAction,
  markStudentProgrammeNotificationReadAction,
} from "@/server/actions/programme-reporting.actions";

const REFETCH_INTERVAL_MS = 15000;

export function useProgrammeNotifications(
  studentId: string,
  festivalId?: string,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      "programme-notifications",
      festivalId ?? "no-festival",
      studentId,
    ],
    queryFn: () => getStudentProgrammeNotificationsAction(studentId),
    enabled: Boolean(studentId),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const roomKey =
    studentId && festivalId
      ? `festival:${festivalId}:student:${studentId}`
      : null;

  const { status: realtimeStatus } = useRealtimeChannel({
    roomKeys: roomKey ? [roomKey] : [],
    enabled: Boolean(studentId && roomKey),
    onEvent: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "programme-notifications",
          festivalId ?? "no-festival",
          studentId,
        ],
      });
    },
  });

  useEffect(() => {
    if (!studentId || roomKey) return;
    // Require festival-scoped room streaming to avoid unscoped student query streams.
    void queryClient.invalidateQueries({
      queryKey: [
        "programme-notifications",
        festivalId ?? "no-festival",
        studentId,
      ],
    });
  }, [festivalId, queryClient, roomKey, studentId]);

  useEffect(() => {
    if (!studentId) return;
    if (realtimeStatus === "degraded") {
      void queryClient.invalidateQueries({
        queryKey: [
          "programme-notifications",
          festivalId ?? "no-festival",
          studentId,
        ],
      });
    }
  }, [festivalId, queryClient, realtimeStatus, studentId]);

  const markOne = useMutation({
    mutationFn: (notificationId: string) =>
      markStudentProgrammeNotificationReadAction(studentId, notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "programme-notifications",
          festivalId ?? "no-festival",
          studentId,
        ],
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllStudentProgrammeNotificationsReadAction(studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "programme-notifications",
          festivalId ?? "no-festival",
          studentId,
        ],
      });
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    realtimeStatus,
    markOneRead: (id: string) => markOne.mutate(id),
    markAllRead: () => markAll.mutate(),
  };
}
