"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertCircleFilled,
  IconChevronDown,
  IconCircleCheckFilled,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { TaskDependencyQueries, TaskQueries } from "@/lib/query/query.func";
import { type Task, TASK_STATUS } from "@/types/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusVariant } from "../constants";

interface DependenciesTabProps {
  taskId: string;
}

export function DependenciesTab({ taskId }: DependenciesTabProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: dependencies } = useQuery({
    queryKey: TaskDependencyQueries.keys.byTask(taskId),
    queryFn: () => TaskDependencyQueries.fetch(taskId),
  });

  const { data: task } = useQuery({
    queryKey: TaskQueries.keys.detail(taskId),
    queryFn: () => TaskQueries.fetchByIdWithCounts(taskId),
    select: (data) => data?.task,
  });

  const { data: projectTasks } = useQuery({
    queryKey: TaskQueries.keys.byProject(task?.projectId || ""),
    queryFn: () => TaskQueries.fetchAll(task?.projectId),
    enabled: !!task?.projectId,
    select: (data) => data?.filter((t: Task) => t.id !== taskId) ?? [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: TaskDependencyQueries.keys.byTask(taskId),
    });
  };

  const addDependency = useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      TaskDependencyQueries.create(taskId, dependsOnTaskId),
    onSuccess: () => {
      setOpen(false);
      invalidate();
      toast.success("Dependency added");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to add dependency");
    },
  });

  const removeDependency = useMutation({
    mutationFn: (dependencyId: string) =>
      TaskDependencyQueries.delete(taskId, dependencyId),
    onSuccess: () => {
      invalidate();
      toast.success("Dependency removed");
    },
    onError: () => toast.error("Failed to remove dependency"),
  });

  const dependencyIds = new Set(
    dependencies?.dependencies.map((d: any) => d.dependsOnTaskId) || [],
  );
  const availableTasks =
    projectTasks?.filter((t: Task) => !dependencyIds.has(t.id)) || [];

  const hasBlockedDependencies = dependencies?.dependencies.some(
    (dep: any) => !dep.dependsOnTask.completedAt,
  );

  const deps = dependencies?.dependencies || [];
  const dependents = dependencies?.dependents || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Dependencies</h3>
        {hasBlockedDependencies && (
          <IconAlertCircleFilled className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        )}
      </div>
      {deps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">This task depends on:</p>
          <div className="space-y-1.5">
            {deps.map((dep: any) => (
              <div
                key={dep.id}
                className="flex items-start gap-2.5 group py-2 px-2.5 hover:bg-muted/60 transition-colors border"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {dep.dependsOnTask.title}
                    </span>
                    {dep.dependsOnTask.completedAt ? (
                      <IconCircleCheckFilled className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                    ) : (
                      <IconAlertCircleFilled className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        statusVariant[dep.dependsOnTask.status as TASK_STATUS]
                      }
                      size="sm"
                    >
                      {statusLabel[dep.dependsOnTask.status as TASK_STATUS]}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => removeDependency.mutate(dep.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                  title="Remove dependency"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-dashed border-border">
              <span className="flex-1 text-left">+ Add dependency</span>
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-75 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tasks..." />
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup className="max-h-50 overflow-y-auto">
                {availableTasks.map((t: Task) => (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onSelect={() => {
                      addDependency.mutate(t.id);
                    }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.status.replace(/_/g, " ")}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {dependents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Tasks depending on this:
          </p>
          <div className="space-y-1.5">
            {dependents.map((dep: any) => (
              <div
                key={dep.id}
                className="flex items-center justify-between space-y-1 py-2 px-2.5 border border-border/30 bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{dep.task.title}</span>
                </div>
                <div>
                  <Badge
                    variant={statusVariant[dep.task.status as TASK_STATUS]}
                    size="sm"
                  >
                    {statusLabel[dep.task.status as TASK_STATUS]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deps.length === 0 && dependents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No dependencies yet
        </p>
      )}
    </div>
  );
}
