"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { SubtaskQueries, TaskQueries } from "@/lib/query/query.func";
import { formatDate } from "@/lib/utils";

interface SubtasksTabProps {
  taskId: string;
}

export function SubtasksTab({ taskId }: SubtasksTabProps) {
  const queryClient = useQueryClient();
  const [newSubtask, setNewSubtask] = useState("");

  const { data: subtasks = [] } = useQuery({
    queryKey: SubtaskQueries.keys.byTask(taskId),
    queryFn: () => SubtaskQueries.fetchByTask(taskId),
  });

  const doneSubs = subtasks.filter((s: any) => s.isDone).length;

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: SubtaskQueries.keys.byTask(taskId),
    });
  };

  const addSubtask = useMutation({
    mutationFn: (t: string) => SubtaskQueries.create(taskId, t),
    onSuccess: () => {
      setNewSubtask("");
      invalidate();
    },
    onError: () => toast.error("Failed to add subtask"),
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      SubtaskQueries.update(taskId, id, { isDone }),
    onSuccess: invalidate,
  });

  const deleteSubtask = useMutation({
    mutationFn: (id: string) => SubtaskQueries.delete(taskId, id),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to delete subtask"),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold">Sub-tasks</h3>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {doneSubs}/{subtasks.length}
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="space-y-0.5 mb-3">
          {subtasks.map((s: any) => (
            <div
              key={s.id}
              className="flex items-center gap-2.5 group py-1.5 px-2 hover:bg-muted/60 rounded-md transition-colors"
            >
              <button
                onClick={() =>
                  toggleSubtask.mutate({ id: s.id, isDone: !s.isDone })
                }
                className={`h-4 w-4 border rounded flex items-center justify-center shrink-0 transition-colors ${
                  s.isDone
                    ? "bg-primary border-primary"
                    : "border-muted-foreground hover:border-primary"
                }`}
              >
                {s.isDone && (
                  <IconCheck className="h-2.5 w-2.5 text-primary-foreground" />
                )}
              </button>
              <span
                className={`text-sm flex-1 ${s.isDone ? "line-through text-muted-foreground" : ""}`}
              >
                {s.title}
              </span>
              {s.deadline && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(s.deadline)}
                </span>
              )}
              <button
                onClick={() => deleteSubtask.mutate(s.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-2">
        <input
          className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-border outline-none py-1.5 placeholder:text-muted-foreground/50 transition-colors"
          placeholder="+ Add sub-task"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newSubtask.trim()) {
              addSubtask.mutate(newSubtask.trim());
            }
          }}
        />
        {newSubtask.trim() && (
          <button
            onClick={() => addSubtask.mutate(newSubtask.trim())}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}
