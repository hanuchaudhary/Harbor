"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeLogQueries, TaskQueries } from "@/lib/query/query.func";
import { TIME_LOG_TYPE } from "@/types/types";

interface TimeLogDialogProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
  myRunningTimeLog?: {
    id: string;
    startedAt: string;
    type: TIME_LOG_TYPE;
    note: string | null;
  } | null;
}

type TabType = "manual" | "timer";

export function TimeLogDialog({
  taskId,
  open,
  onClose,
  myRunningTimeLog,
}: TimeLogDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("timer");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [timerElapsed, setTimerElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setTab("timer");
      setMinutes("");
      setNote("");
      setTimerElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    if (myRunningTimeLog) {
      const startTime = new Date(myRunningTimeLog.startedAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setTimerElapsed(elapsed);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [myRunningTimeLog]);

  const startTimerMutation = useMutation({
    mutationFn: () =>
      TimeLogQueries.startTimer(taskId, {
        type: TIME_LOG_TYPE.AUTO,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.byTask(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.active(),
      });
      toast.success("Timer started");
      onClose();
    },
    onError: () => toast.error("Failed to start timer"),
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => TimeLogQueries.stopTimer(taskId, myRunningTimeLog!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.byTask(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.active(),
      });
      toast.success("Timer stopped");
      onClose();
    },
    onError: () => toast.error("Failed to stop timer"),
  });

  const createManualMutation = useMutation({
    mutationFn: () => {
      const mins = parseInt(minutes) || 0;
      if (mins <= 0) {
        throw new Error("Duration must be greater than 0");
      }
      const duration = mins * 60;
      return TimeLogQueries.createManual(taskId, {
        duration,
        type: TIME_LOG_TYPE.MANUAL,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TimeLogQueries.keys.byTask(taskId),
      });
      toast.success("Time log added");
      onClose();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to add time log"),
  });

  const handleSubmit = () => {
    if (myRunningTimeLog) {
      stopTimerMutation.mutate();
    } else if (tab === "manual") {
      createManualMutation.mutate();
    } else {
      startTimerMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLoading =
    startTimerMutation.isPending ||
    stopTimerMutation.isPending ||
    createManualMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {myRunningTimeLog ? "Stop Timer" : "Log Time"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!myRunningTimeLog && (
            <div className="flex items-center w-fit border divide-x mb-4">
              <button
                onClick={() => setTab("timer")}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-xs transition-colors cursor-pointer font-montreal-mono uppercase font-semibold ${
                  tab === "timer"
                    ? "text-foreground dark:bg-red-950"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => setTab("manual")}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-xs transition-colors cursor-pointer font-montreal-mono uppercase font-semibold ${
                  tab === "manual"
                    ? "text-foreground dark:bg-red-950"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual Entry
              </button>
            </div>
          )}

          {myRunningTimeLog && (
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <div className="text-4xl font-mono font-bold tabular-nums">
                {formatTime(timerElapsed)}
              </div>
              <p className="text-sm text-muted-foreground">Timer running...</p>
            </div>
          )}

          {!myRunningTimeLog && tab === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="minutes">Time Spent (minutes)</Label>
              <Input
                id="minutes"
                type="number"
                min="1"
                placeholder="e.g., 90"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          )}

          {!myRunningTimeLog && tab === "timer" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Click start to begin tracking time
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about this time log..."
              value={myRunningTimeLog?.note || note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={!!myRunningTimeLog}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              "Processing..."
            ) : myRunningTimeLog ? (
              <>
                <IconPlayerStop className="h-4 w-4 mr-1" />
                Stop Timer
              </>
            ) : tab === "timer" ? (
              <>
                <IconPlayerPlay className="h-4 w-4 mr-1" />
                Start Timer
              </>
            ) : (
              "Add Time Log"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
