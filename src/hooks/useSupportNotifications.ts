import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  getUserNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/server/actions/support.actions";
import { useCurrentUser } from "./useCurrentUser";

const REFETCH_INTERVAL_MS = 30 * 1000; // 30 seconds
const STALE_TIME_MS = 60 * 1000; // 1 minute

export interface SupportNotification {
  id: string;
  type: string;
  referenceId: string;
  isRead: boolean;
  createdAt: Date;
  ticketSubject?: string;
}

export function useSupportNotifications() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.support.notifications(user?.id),
    queryFn: getUserNotificationsAction,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!user?.id,
  });

  const notifications: SupportNotification[] = Array.isArray(query.data)
    ? query.data
    : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsReadAction,
    onSuccess: (_, id) => {
      queryClient.setQueryData<SupportNotification[]>(
        queryKeys.support.notifications(user?.id),
        (prev) =>
          (prev ?? []).map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
      );
    },
    onError: () => {
      toast.error("Failed to update notification");
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsReadAction,
    onSuccess: () => {
      queryClient.setQueryData<SupportNotification[]>(
        queryKeys.support.notifications(user?.id),
        (prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })),
      );
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to update notifications");
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
