import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    markOneRead: (id: string) => markOne.mutate(id),
    markAllRead: () => markAll.mutate(),
  };
}
