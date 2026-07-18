"use client";

import { Link } from "react-router";
import { IconTrash } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Task } from "@/types/types";
import { priorityLabel, priorityVariant } from "./constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import UserAvatar from "../user-avatar";
import { formatTaskTimeLogDuration } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  readOnly?: boolean;
  hoveredTaskId?: string | null;
  hoveredDependencyIds?: string[];
  onHoverChange?: (taskId: string | null) => void;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  readOnly,
  hoveredTaskId,
  hoveredDependencyIds = [],
  onHoverChange,
}: TaskCardProps) {
  const isHovered = hoveredTaskId === task.id;
  const isDependency = hoveredDependencyIds.includes(task.id);
  const shouldHighlight = isHovered || isDependency;

  return (
    <div
      className="relative group"
      onMouseEnter={() => onHoverChange?.(task.id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <div
        className={cn(
          "relative border bg-background p-3 space-y-2 group/card select-none transition-all duration-200",
          shouldHighlight ? "hover:border-red-950" : "hover:border-primary/50",
          isDependency && "dark:bg-red-950 bg-red-100",
          task.tags.length > 0 && task.dependencies?.length! > 0 ? "" : "mb-2",
        )}
      >
        <div className="relative flex items-start justify-between gap-2">
          {readOnly ? (
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
              {task.title}
            </p>
          ) : (
            <Link
              to={`/tracker/${task.id}`}
              className="text-sm font-medium leading-snug line-clamp-2 flex-1 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
            </Link>
          )}
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onDelete(task)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <IconTrash className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={priorityVariant[task.priority]} className="text-xs">
            {priorityLabel[task.priority]}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {task.project.name}
          </span>
        </div>

        <div>
          {(task.startDate || task.endDate) && (
            <p className="text-xs text-muted-foreground">
              {task.endDate
                ? `Due ${formatDate(task.endDate)}`
                : `From ${formatDate(task.startDate)}`}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(task.createdAt)}
            </span>
            {!!task.totalTime && (
              <span className="text-xs font-montreal-mono text-red-400">
                {formatTaskTimeLogDuration(task.totalTime)}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          {task.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignees.map((assignee) => (
                <Tooltip key={assignee.id}>
                  <TooltipTrigger>
                    <UserAvatar
                      size="sm"
                      alt={assignee.user.name}
                      src={assignee.user.image!}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{assignee.user.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
          {task.tags.length > 0 && (
            <div className="absolute -bottom-6 right-0 z-10 flex items-center">
              {task.tags.map((t) => (
                <div
                  key={t.tag.id}
                  className={`px-1.5 py-1 text-[10px] text-white uppercase font-semibold font-montreal-mono`}
                  style={{ backgroundColor: t.tag.color }}
                >
                  {t.tag.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {task.dependencies!.length > 0 && (
        <div
          className={cn(
            "dark:bg-red-950 bg-red-100 max-w-[90%] mx-auto border-dashed divide-dashed border-x border-b w-full transition-all divide-y dark:border-border border-primary/30 dark:divide-border divide-primary/30",
            shouldHighlight ? "" : "group-hover:scale-105",
            task.tags.length && "pt-2.5",
          )}
        >
          {task.dependencies!.map((dep) => {
            const isDepHighlighted = hoveredTaskId === dep.dependsOnTask.id;
            return (
              <div
                key={dep.dependsOnTask.id}
                className={cn(
                  "flex items-center justify-between p-1 transition-colors",
                  isDepHighlighted && "bg-primary/30",
                )}
              >
                <p className="text-xs">{dep.dependsOnTask.title}</p>
                <p className="text-[10px] text-red-400 font-semibold">
                  {"{" + dep.dependsOnTask.status + "}"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
