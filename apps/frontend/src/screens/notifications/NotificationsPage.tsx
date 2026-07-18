"use client";

import { useCallback } from "react";
import { useNavigate } from "react-router";

import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconBell, IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { http as axios } from "@/lib/api/http";

import { Button } from "@/components/ui/button";
import { Notification } from "@/types/types";
import { cn } from "@/lib/utils";

async function fetchNotifications() {
  const { data } = await axios.get<{
    notifications: Notification[];
    unreadCount: number;
  }>("/api/notifications");
  return data;
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    overflow: "hidden",
    transition: { duration: 0.16 },
  },
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markAllRead = useMutation({
    mutationFn: () => axios.patch("/api/notifications"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const clearRead = useMutation({
    mutationFn: () => axios.delete("/api/notifications"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const handleClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markOneRead.mutate(notification.id);
      }
      if (notification.link) {
        navigate(notification.link);
      }
    },
    [markOneRead, navigate],
  );

  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some((n) => n.read);

  return (
    <div className="">
      <div className="max-w-xl sticky top-0 bg-background pt-6 pb-4">
        <h1>Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay updated with the latest notifications about your projects, tasks,
          and team activities. Click on a notification to view details and take
          action.
        </p>
      </div>
      <div className="max-w-3xl ml-auto mt-4 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasUnread && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <IconCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
            {hasRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => clearRead.mutate()}
                disabled={clearRead.isPending}
              >
                <IconTrash className="size-3.5" />
                Clear read
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground border">
            <IconBell className="size-10 stroke-1" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="border divide-y">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <motion.li
                  key={notification.id}
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className={cn(
                    "group relative flex gap-4 px-5 py-4 cursor-pointer hover:bg-accent/50 transition-colors",
                    !notification.read && "bg-accent/50",
                  )}
                  onClick={() => handleClick(notification)}
                >
                  <div className="mt-2 shrink-0">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        notification.read ? "bg-transparent" : "bg-primary",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <p className="text-sm font-medium leading-snug">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        className="flex items-center justify-center size-7 hover:bg-background border rounded-sm transition-colors"
                        title="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markOneRead.mutate(notification.id);
                        }}
                      >
                        <IconCheck className="size-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      className="flex items-center justify-center size-7 hover:bg-background border rounded-sm transition-colors"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOne.mutate(notification.id);
                      }}
                    >
                      <IconX className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
