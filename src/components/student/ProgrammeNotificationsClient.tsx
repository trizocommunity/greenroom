"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProgrammeNotifications } from "@/hooks/useProgrammeNotifications";

export function ProgrammeNotificationsClient({ studentId }: { studentId: string }) {
  const { notifications, unreadCount, isLoading, markAllRead, markOneRead } =
    useProgrammeNotifications(studentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Live updates for programme reporting and code letters.
          </p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all read ({unreadCount})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
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
                onClick={() => markOneRead(n.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  n.isRead ? "bg-background" : "bg-primary/5 border-primary/30"
                }`}
              >
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
