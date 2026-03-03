"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getUserNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/server/actions/support.actions";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  referenceId: string;
  isRead: boolean;
  createdAt: Date;
}

export function SupportNotifications({
  slug,
  isAdmin = false,
}: {
  slug?: string;
  isAdmin?: boolean;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getUserNotificationsAction();
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(
        Array.isArray(data) ? data.filter((n: any) => !n.isRead).length : 0,
      );
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-auto px-2 py-1"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const title =
                  notification.type === "NEW_REPLY"
                    ? "New Reply"
                    : notification.type === "NEW_TICKET"
                      ? "New Ticket"
                      : "Update";

                // @ts-ignore
                const subject = notification.ticketSubject;

                return (
                  <Link
                    key={notification.id}
                    href={
                      isAdmin
                        ? `/super-admin/support/${notification.referenceId}`
                        : `/dashboard/${slug}/support/tickets/${notification.referenceId}`
                    }
                    onClick={() => {
                      if (!notification.isRead)
                        handleMarkAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                      !notification.isRead ? "bg-muted/20" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium leading-none">
                        {title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    {subject && (
                      <p className="text-xs font-medium text-foreground/90 mt-0.5 line-clamp-1">
                        {subject}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground pt-1">
                      {format(
                        new Date(notification.createdAt),
                        "MMM d, h:mm a",
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
