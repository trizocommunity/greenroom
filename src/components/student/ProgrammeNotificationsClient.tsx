"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProgrammeNotificationsClient({
  studentId,
  festivalId: _festivalId,
}: {
  studentId: string;
  festivalId: string;
}) {
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useNotifications(studentId);
  const markAllReadMutation = useMarkAllNotificationsRead();
  const markOneReadMutation = useMarkNotificationRead();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Live updates for programme reporting and code letters.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllReadMutation.mutate({ studentId })}
          disabled={unreadCount === 0}
        >
          Mark all read ({unreadCount})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading notifications...
            </p>
          ) : isError ? (
            <div className="text-sm text-destructive">
              Error: {error.message}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() =>
                  markOneReadMutation.mutate({
                    studentId,
                    notificationId: n.id,
                  })
                }
                className={`w-full rounded-lg border p-3 text-left ${
                  n.isRead ? "bg-background" : "bg-primary/5 border-primary/30"
                }`}
              >
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
