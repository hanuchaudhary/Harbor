"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconTrash,
  IconPlayerStopFilled,
  IconClockFilled,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/user-avatar";
import { TimeLogDialog } from "./time-log-dialog";
import { TimeLogQueries, TaskQueries } from "@/lib/query/query.func";
import { formatDate } from "@/lib/utils";
import { TIME_LOG_TYPE } from "@/types/types";
import { authClient } from "@/lib/auth/auth.client";

interface TimeTabProps {
  taskId: string;
}

export function TimeTab({ taskId }: TimeTabProps) {
  const queryClient = useQueryClient();
  const session = authClient.useSession().data;
  const currentUserId = session?.user?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setTick] = useState(0);

  const { data: timeLogs = [] } = useQuery({
    queryKey: TimeLogQueries.keys.byTask(taskId),
    queryFn: () => TimeLogQueries.fetchByTask(taskId),
  });

  const myRunningTimeLog = timeLogs.find(
    (tl: any) => tl.isRunning && tl.userId === currentUserId,
  );
  const hasAnyRunningTimer = timeLogs.some((tl: any) => tl.isRunning);

  useEffect(() => {
    if (hasAnyRunningTimer) {
      const interval = setInterval(() => {
        setTick((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasAnyRunningTimer]);

  const deleteMutation = useMutation({
    mutationFn: (timeLogId: string) => TimeLogQueries.delete(taskId, timeLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.byTask(taskId),
      });
      toast.success("Time log deleted");
    },
    onError: () => toast.error("Failed to delete time log"),
  });

  const stopTimerMutation = useMutation({
    mutationFn: (timeLogId: string) => TimeLogQueries.stopTimer(taskId, timeLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.byTask(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.active(),
      });
      toast.success("Timer stopped");
    },
    onError: () => toast.error("Failed to stop timer"),
  });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const getElapsedTime = (timeLog: any) => {
    if (timeLog.isRunning && timeLog.startedAt) {
      const startTime = new Date(timeLog.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      return elapsed;
    }
    return timeLog.duration;
  };

  const totalDuration = timeLogs.reduce(
    (sum: number, tl: any) => sum + getElapsedTime(tl),
    0,
  );

  if (timeLogs.length === 0 && !hasAnyRunningTimer) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Time Logs</h3>
          <Button onClick={() => setDialogOpen(true)}>
            <IconClockFilled className="h-4 w-4" />
            Log Time
          </Button>
        </div>
        <div className="py-10 text-center text-sm text-muted-foreground">
          No time logged yet
        </div>
        <TimeLogDialog
          taskId={taskId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          myRunningTimeLog={myRunningTimeLog}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Time Logs</h3>
          <Badge variant="secondary" className="tabular-nums">
            Total: {formatDuration(totalDuration)}
          </Badge>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <IconClockFilled className="h-6 w-6" />
          Log Time
        </Button>
      </div>

      <div className="space-y-2">
        {timeLogs.map((timeLog: any) => (
          <div
            key={timeLog.id}
            className="flex items-start gap-3 p-3 border bg-card"
          >
            <UserAvatar
              src={timeLog.user.image || ""}
              alt={timeLog.user.name}
              size="sm"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{timeLog.user.name}</span>
                <Badge
                  variant={
                    timeLog.type === TIME_LOG_TYPE.MANUAL
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {timeLog.type}
                </Badge>
                {timeLog.isRunning && (
                  <Badge
                    variant="destructive"
                    className="text-xs animate-pulse"
                  >
                    Running
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold tabular-nums">
                  {formatDuration(getElapsedTime(timeLog))}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(timeLog.createdAt)}
                </span>
              </div>

              {timeLog.note && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {timeLog.note}
                </p>
              )}
            </div>

            {currentUserId === timeLog.userId && timeLog.isRunning && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopTimerMutation.mutate(timeLog.id)}
                disabled={stopTimerMutation.isPending}
              >
                <IconPlayerStopFilled className="h-4 w-4 mr-1" />
                Stop
              </Button>
            )}
            {currentUserId === timeLog.userId && !timeLog.isRunning && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteMutation.mutate(timeLog.id)}
                disabled={deleteMutation.isPending}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <TimeLogDialog
        taskId={taskId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        myRunningTimeLog={
          myRunningTimeLog
            ? {
                id: myRunningTimeLog.id,
                startedAt: myRunningTimeLog.startedAt ?? new Date().toISOString(),
                type: myRunningTimeLog.type,
                note: myRunningTimeLog.note,
              }
            : null
        }
      />
    </div>
  );
}
