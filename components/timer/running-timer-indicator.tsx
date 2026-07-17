"use client";

import { useState, useEffect } from "react";
import { IconPlayerStopFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRunningTimer } from "@/hooks/use-running-timer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TimeLogQueries } from "@/lib/query/query.func";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RunningTimerIndicator() {
  const { runningTimers, isLoading } = useRunningTimer();
  const [open, setOpen] = useState(false);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (runningTimers.length === 0) return;

    const updateElapsed = () => {
      const now = Date.now();
      const newElapsed: Record<string, number> = {};

      runningTimers.forEach((timer: any) => {
        const startTime = new Date(timer.startedAt).getTime();
        newElapsed[timer.id] = Math.floor((now - startTime) / 1000);
      });

      setElapsedTimes(newElapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [runningTimers]);

  const stopTimerMutation = useMutation({
    mutationFn: ({
      taskId,
      timeLogId,
    }: {
      taskId: string;
      timeLogId: string;
    }) => TimeLogQueries.stopTimer(taskId, timeLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.active(),
      });
      toast.success("Timer stopped");
    },
    onError: () => toast.error("Failed to stop timer"),
  });

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading || runningTimers.length === 0) {
    return null;
  }

  const oldestTimer = runningTimers[0];
  const oldestElapsed = elapsedTimes[oldestTimer?.id] || 0;

  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex px-3 py-3 gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors w-full text-xs cursor-pointer"
      >
        <p className="line-clamp-1">{runningTimers[0].task.title}</p>
        <p className="font-mono font-semibold tabular-nums">
          {formatTime(oldestElapsed)}
        </p>
        {runningTimers.length > 1 && (
          <p className="text-xs opacity-70">+{runningTimers.length - 1}</p>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Running Timers ({runningTimers.length})</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {runningTimers.map((timer: any) => (
              <div key={timer.id} className="">
                <div className="flex-1">
                  <p
                    onClick={() => {
                      router.push(`/tracker/${timer.taskId}`);
                      setOpen(false);
                    }}
                    className="font-medium line-clamp-2 underline hover:text-red-500 cursor-pointer w-fit"
                  >
                    {timer.task.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {new Date(timer.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-4 mt-8 items-center justify-end">
                  <div className="text-2xl font-mono font-bold tabular-nums">
                    {formatTime(elapsedTimes[timer.id] || 0)}
                  </div>
                  <Button
                    variant={"destructive"}
                    onClick={() =>
                      stopTimerMutation.mutate({
                        taskId: timer.taskId,
                        timeLogId: timer.id,
                      })
                    }
                    disabled={stopTimerMutation.isPending}
                  >
                    <IconPlayerStopFilled className="h-5 w-5" />
                    Stop
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
