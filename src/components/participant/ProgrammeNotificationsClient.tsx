"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/api/client";
import { AppEmptyState, AppPageHeader } from "@/components/app/AppSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/utils/cn";

export function ProgrammeNotificationsClient({
  participantId,
  festivalId: _festivalId,
}: {
  participantId: string;
  festivalId: string;
}) {
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useNotifications(participantId);
  const markAllReadMutation = useMarkAllNotificationsRead();
  const markOneReadMutation = useMarkNotificationRead();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Programme reporting and code letters, as they happen."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={() => markAllReadMutation.mutate({ participantId })}
            disabled={unreadCount === 0}
          >
            Mark all read{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-px">
          <Skeleton className="h-20 w-full rounded-none" />
          <Skeleton className="h-20 w-full rounded-none" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load notifications: {error.message}
        </p>
      ) : notifications.length === 0 ? (
        <AppEmptyState
          icon={Bell}
          title="Nothing yet"
          description="You will be notified here when reporting opens for one of your programmes."
        />
      ) : (
        <ul className="border-y border-border">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() =>
                  markOneReadMutation.mutate({
                    participantId,
                    notificationId: n.id,
                  })
                }
                className={cn(
                  "flex w-full gap-3 border-b border-l-2 border-border px-4 py-4 text-left transition-opacity last:border-b-0 hover:opacity-80",
                  n.isRead
                    ? "border-l-transparent"
                    : "border-l-primary bg-primary/[0.04]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-heading">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <>
                    <span className="sr-only">Unread</span>
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
