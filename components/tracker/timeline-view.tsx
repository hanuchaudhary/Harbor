"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import UserAvatar from "@/components/user-avatar";
import { TaskQueries } from "@/lib/query/query.func";
import { useTaskStore } from "@/lib/stores/task.store";
import { cn } from "@/lib/utils";
import { Task } from "@/types/types";
import {
  getTimelinePriorityDotColor,
  getTimelineStatusStripColor,
  KANBAN_COLUMNS,
  priorityLabel,
  priorityOrder,
  priorityVariant,
  statusLabel,
  statusVariant,
} from "./constants";
import { ScrollFadeEffect } from "../ui/scroll-fade-effect";

interface TimelineViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

type ZoomLevel = "day" | "week" | "month";

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 60;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const MONTH_WIDTH = 180;

export function TimelineView({ tasks, onEdit }: TimelineViewProps) {
  const queryClient = useQueryClient();
  const store = useTaskStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawZoom = searchParams.get("zoom");
  const initialZoom: ZoomLevel =
    rawZoom === "day" || rawZoom === "week" || rawZoom === "month"
      ? rawZoom
      : "week";
  const [zoom, setZoom] = useState<ZoomLevel>(initialZoom);
  const [visibleStart, setVisibleStart] = useState(() =>
    subMonths(new Date(), 1),
  );
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStart: Date;
    originalEnd: Date;
    currentStart?: Date;
    currentEnd?: Date;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const didDragRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cellWidth =
    zoom === "day" ? DAY_WIDTH : zoom === "week" ? WEEK_WIDTH : MONTH_WIDTH;

  const visibleEnd = useMemo(() => {
    return addMonths(
      visibleStart,
      zoom === "day" ? 2 : zoom === "week" ? 4 : 12,
    );
  }, [visibleStart, zoom]);

  const timeUnits = useMemo(() => {
    if (zoom === "day") {
      return eachDayOfInterval({ start: visibleStart, end: visibleEnd });
    } else if (zoom === "week") {
      return eachWeekOfInterval(
        { start: visibleStart, end: visibleEnd },
        { weekStartsOn: 0 },
      );
    } else {
      return eachMonthOfInterval({ start: visibleStart, end: visibleEnd });
    }
  }, [visibleStart, visibleEnd, zoom]);

  const tasksWithDates = useMemo(() => {
    return tasks
      .filter((t) => t.startDate && t.endDate)
      .map((task) => ({
        ...task,
        start: new Date(task.startDate!),
        end: new Date(task.endDate!),
      }));
  }, [tasks]);

  const { rowAssignments, totalRows } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      return { rowAssignments: new Map<string, number>(), totalRows: 0 };
    }

    const sorted = [...tasksWithDates].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

    const rowEndTimes: Date[] = [];
    const assignments = new Map<string, number>();

    for (const task of sorted) {
      let assignedRow = -1;

      // Find first row where task fits (row end time < task start)
      for (let row = 0; row < rowEndTimes.length; row++) {
        if (rowEndTimes[row] < task.start) {
          assignedRow = row;
          break;
        }
      }

      // No existing row fits, create a new one
      if (assignedRow === -1) {
        assignedRow = rowEndTimes.length;
      }

      assignments.set(task.id, assignedRow);
      rowEndTimes[assignedRow] = task.end;
    }

    return {
      rowAssignments: assignments,
      totalRows: rowEndTimes.length,
    };
  }, [tasksWithDates]);

  const updateMutation = useMutation({
    mutationFn: ({
      taskId,
      startDate,
      endDate,
    }: {
      taskId: string;
      startDate: string;
      endDate: string;
    }) => TaskQueries.update(taskId, { startDate, endDate }),
    onSuccess: (data) => {
      store.updateTask(data.id, data);
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
    },
    onError: () => toast.error("Failed to update task dates"),
  });

  const getXPosition = useCallback(
    (date: Date) => {
      const diff = differenceInDays(date, visibleStart);
      const cellsPerDay = zoom === "day" ? 1 : zoom === "week" ? 1 / 7 : 1 / 30;
      return diff * cellsPerDay * cellWidth;
    },
    [visibleStart, zoom, cellWidth],
  );

  const handleMouseDown = (
    e: React.MouseEvent,
    task: Task,
    mode: "move" | "resize-start" | "resize-end",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
    setDragState({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: new Date(task.startDate!),
      originalEnd: new Date(task.endDate!),
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return;

      const deltaX = e.clientX - dragState.startX;
      if (Math.abs(deltaX) > 3) didDragRef.current = true;
      const deltaDays = Math.round(
        (deltaX / cellWidth) * (zoom === "day" ? 1 : zoom === "week" ? 7 : 30),
      );

      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;

      if (dragState.mode === "move") {
        newStart = addDays(dragState.originalStart, deltaDays);
        newEnd = addDays(dragState.originalEnd, deltaDays);
      } else if (dragState.mode === "resize-start") {
        newStart = addDays(dragState.originalStart, deltaDays);
        if (newStart >= newEnd) {
          newStart = addDays(newEnd, -1);
        }
      } else if (dragState.mode === "resize-end") {
        newEnd = addDays(dragState.originalEnd, deltaDays);
        if (newEnd <= newStart) {
          newEnd = addDays(newStart, 1);
        }
      }

      setDragState((prev) =>
        prev ? { ...prev, currentStart: newStart, currentEnd: newEnd } : null,
      );
    },
    [dragState, cellWidth, zoom],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState || !dragState.currentStart || !dragState.currentEnd) {
      setDragState(null);
      return;
    }

    updateMutation.mutate({
      taskId: dragState.taskId,
      startDate: dragState.currentStart.toISOString(),
      endDate: dragState.currentEnd.toISOString(),
    });

    setDragState(null);
  }, [dragState, updateMutation]);

  const handleSetZoom = (z: ZoomLevel) => {
    setZoom(z);
    const params = new URLSearchParams(searchParams.toString());
    params.set("zoom", z);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    const todayX = getXPosition(new Date());
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = todayX - containerWidth / 2;
  }, [zoom, getXPosition]);

  useEffect(() => {
    if (dragState) {
      const cursorStyle = dragState.mode === "move" ? "grabbing" : "ew-resize";
      document.body.style.cursor = cursorStyle;
      document.body.style.userSelect = "none";

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const dependencyPaths = useMemo(() => {
    const paths: {
      id: string;
      from: Task;
      to: Task;
      path: string;
      color: string;
    }[] = [];

    tasksWithDates.forEach((task) => {
      task.dependencies?.forEach((dep) => {
        const depTask = tasksWithDates.find(
          (t) => t.id === dep.dependsOnTaskId,
        );
        if (depTask) {
          // Use row assignments instead of array indices
          const fromRow = rowAssignments.get(depTask.id) ?? 0;
          const toRow = rowAssignments.get(task.id) ?? 0;

          const fromX = getXPosition(depTask.end);
          const fromY = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toX = getXPosition(task.start);
          const toY = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;

          const controlOffset = Math.min(Math.abs(toX - fromX) / 2, 60);
          const path = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;

          const isBlocked = dep.dependsOnTask.status !== "COMPLETED";
          const color = isBlocked ? "rgb(239, 68, 68)" : "rgb(34, 197, 94)";

          paths.push({
            id: `${depTask.id}-${task.id}`,
            from: depTask,
            to: task,
            path,
            color,
          });
        }
      });
    });

    return paths;
  }, [tasksWithDates, getXPosition, rowAssignments]);

  const handlePanLeft = () => {
    setVisibleStart(
      subMonths(visibleStart, zoom === "day" ? 0.5 : zoom === "week" ? 1 : 3),
    );
  };

  const handlePanRight = () => {
    setVisibleStart(
      addMonths(visibleStart, zoom === "day" ? 0.5 : zoom === "week" ? 1 : 3),
    );
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed bg-muted/50">
        <p className="text-muted-foreground">
          No tasks with dates to display in timeline view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            className="hover:bg-muted cursor-pointer hover:scale-125 transition-transform"
            onClick={handlePanLeft}
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="hover:bg-muted cursor-pointer hover:scale-125 transition-transform"
            onClick={handlePanRight}
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="border divide-x">
            <button
              className={`px-3 py-1.5 text-xs font-montreal-mono uppercase font-semibold transition-colors cursor-pointer ${
                zoom === "day"
                  ? "dark:bg-red-950 text-foreground bg-red-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleSetZoom("day")}
            >
              Day
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-montreal-mono uppercase font-semibold transition-colors cursor-pointer ${
                zoom === "week"
                  ? "dark:bg-red-950 text-foreground bg-red-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleSetZoom("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-montreal-mono uppercase font-semibold transition-colors cursor-pointer ${
                zoom === "month"
                  ? "dark:bg-red-950 text-foreground bg-red-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleSetZoom("month")}
            >
              Month
            </button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="h-8 w-8 border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                <IconInfoCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold mb-1">
                    Strip colors by status
                  </div>
                  <div className="space-y-1">
                    {KANBAN_COLUMNS.map((column) => (
                      <div key={column.id} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5",
                            getTimelineStatusStripColor(column.id),
                          )}
                        />
                        <span>{statusLabel[column.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-1">Priority dot colors</div>
                  <div className="space-y-1">
                    {priorityOrder.map((priority) => (
                      <div key={priority} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5",
                            getTimelinePriorityDotColor(priority),
                          )}
                        />
                        <span>{priorityLabel[priority]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <ScrollFadeEffect
        ref={scrollRef}
        orientation="horizontal"
        className="relative scrollbar-hidden"
      >
        <div
          className="relative"
          style={{ minWidth: timeUnits.length * cellWidth }}
        >
          <div
            className="sticky top-0 z-20 bg-background"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="flex">
              {timeUnits.map((date, idx) => {
                const isCurrentPeriod =
                  zoom === "day"
                    ? isToday(date)
                    : zoom === "week"
                      ? isToday(date) ||
                        (new Date() >= date && new Date() <= endOfWeek(date))
                      : isToday(date) ||
                        (new Date() >= startOfMonth(date) &&
                          new Date() <= endOfMonth(date));

                return (
                  <div
                    key={idx}
                    className={cn(
                      "border-r border-border/50 flex flex-col items-center justify-center text-xs",
                      isCurrentPeriod &&
                        "bg-primary/80 text-primary-foreground",
                      idx % 2 === 0 && "bg-muted/30",
                    )}
                    style={{ width: cellWidth, height: HEADER_HEIGHT }}
                  >
                    <div className="font-semibold">
                      {zoom === "day" && formatDate(date, "custom", "d")}
                      {zoom === "week" &&
                        `Week ${formatDate(date, "custom", "w")}`}
                      {zoom === "month" && formatDate(date, "custom", "MMM")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {zoom === "day" && formatDate(date, "custom", "EEE")}
                      {zoom === "week" && formatDate(date, "custom", "MMM d")}
                      {zoom === "month" && formatDate(date, "custom", "yyyy")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative" style={{ height: totalRows * ROW_HEIGHT }}>
            {Array.from({ length: totalRows }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="absolute left-0 right-0 flex"
                style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                {timeUnits.map((_, cellIdx) => (
                  <div
                    key={cellIdx}
                    className={cn(
                      "border-r border-border/50 h-full",
                      cellIdx % 2 === 0 ? "bg-muted/30" : "bg-transparent",
                    )}
                    style={{ width: cellWidth }}
                  />
                ))}
              </div>
            ))}

            <svg
              ref={svgRef}
              className="absolute top-0 left-0 pointer-events-none z-10"
              style={{
                width: timeUnits.length * cellWidth,
                height: totalRows * ROW_HEIGHT,
              }}
            >
              {dependencyPaths.map(({ id, path, color }) => (
                <g key={id}>
                  <path
                    d={path}
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                    markerEnd="url(#arrowhead)"
                    filter="url(#glow)"
                  />
                </g>
              ))}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3, 0 6"
                    fill="currentColor"
                    className="text-current"
                  />
                </marker>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>

            {tasksWithDates.map((task, index) => {
              const isDragging = dragState?.taskId === task.id;
              const displayStart =
                isDragging && dragState.currentStart
                  ? dragState.currentStart
                  : task.start;
              const displayEnd =
                isDragging && dragState.currentEnd
                  ? dragState.currentEnd
                  : task.end;

              const startX = getXPosition(displayStart);
              const endX = getXPosition(addDays(displayEnd, 1));
              const width = Math.max(endX - startX, 80);
              const rowIndex = rowAssignments.get(task.id) ?? 0;

              return (
                <Tooltip key={task.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute rounded-lg flex items-center justify-between group transition-shadow overflow-hidden ring-1 ring-inset ring-black/10 dark:ring-white/15",
                        getTimelineStatusStripColor(task.status),
                        isDragging
                          ? "opacity-90 shadow-2xl ring-2 ring-white/50 scale-105 cursor-grabbing z-20"
                          : "cursor-grab hover:shadow-lg hover:z-10",
                      )}
                      style={{
                        left: startX,
                        top: rowIndex * ROW_HEIGHT + 8,
                        width: width - index * .15,
                        height: ROW_HEIGHT - 16,
                        transition: isDragging
                          ? "none"
                          : "box-shadow 0.2s, transform 0.2s",
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task, "move")}
                      onClick={(e) => {
                        if (didDragRef.current) return;
                        e.stopPropagation();
                        onEdit(task);
                      }}
                    >
                      <div
                        className="absolute inset-0 bg-white/20 rounded-lg shadow-lg"
                        style={{
                          width: `${task.progressPct}%`,
                          transition: "width 0.3s ease",
                        }}
                      />

                      <div
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 flex items-center justify-center z-10",
                          isDragging && dragState.mode === "resize-start"
                            ? "bg-white/30"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onMouseDown={(e) =>
                          handleMouseDown(e, task, "resize-start")
                        }
                      >
                        <div className="w-1 h-4 bg-white/60 rounded-full" />
                      </div>

                      <div className="relative z-1 px-3 text-xs font-medium text-white truncate flex-1 pointer-events-none select-none flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-white/60",
                            getTimelinePriorityDotColor(task.priority),
                          )}
                        />
                        <span className="truncate flex-1">
                          {width > 120
                            ? task.title
                            : width > 80
                              ? `${task.title.slice(0, 15)}...`
                              : ""}
                        </span>
                        {width > 140 && task.progressPct > 0 && (
                          <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded shrink-0">
                            {task.progressPct}%
                          </span>
                        )}
                        {width > 160 &&
                          task.assignees &&
                          task.assignees.length > 0 && (
                            <div className="flex -space-x-2 shrink-0">
                              {task.assignees.slice(0, 3).map((assignee) => (
                                <UserAvatar
                                  key={assignee.id}
                                  size="sm"
                                  src={assignee.user.image!}
                                  alt={assignee.user.name}
                                />
                              ))}
                              {task.assignees.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-white text-black text-[10px] font-semibold flex items-center justify-center border-2 border-white">
                                  +{task.assignees.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                      </div>

                      <div
                        className={cn(
                          "absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 flex items-center justify-center z-10",
                          isDragging && dragState.mode === "resize-end"
                            ? "bg-white/30"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onMouseDown={(e) =>
                          handleMouseDown(e, task, "resize-end")
                        }
                      >
                        <div className="w-1 h-4 bg-white/60 rounded-full" />
                      </div>

                      {isDragging && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                          {formatDate(displayStart, "custom", "MMM d")} -{" "}
                          {formatDate(displayEnd, "custom", "MMM d")} (
                          {differenceInDays(displayEnd, displayStart) + 1}d)
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <div className="text-xs space-y-2">
                      <div className="font-semibold">{task.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={priorityVariant[task.priority]}
                          className="text-[9px]"
                        >
                          {task.priority}
                        </Badge>
                        <Badge
                          variant={statusVariant[task.status]}
                          className="text-[9px]"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      {task.assignees && task.assignees.length > 0 && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">
                            Assignees:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {task.assignees.map((assignee) => (
                              <div
                                key={assignee.id}
                                className="flex items-center gap-1"
                              >
                                <UserAvatar
                                  size="sm"
                                  src={assignee.user.image!}
                                  alt={assignee.user.name}
                                />
                                <span className="text-[10px]">
                                  {assignee.user.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">
                            Dependencies:
                          </div>
                          {task.dependencies.map((dep, depIdx) => (
                            <div
                              key={depIdx}
                              className="flex items-center gap-2"
                            >
                              <span className="truncate text-[10px]">
                                {dep.dependsOnTask.title}
                              </span>
                              <Badge
                                variant={
                                  statusVariant[dep.dependsOnTask.status]
                                }
                                className="text-[9px] px-1 py-0"
                              >
                                {statusLabel[dep.dependsOnTask.status]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(task.start, "custom", "MMM d")} -{" "}
                        {formatDate(task.end, "custom", "MMM d")} (
                        {differenceInDays(task.end, task.start) + 1}d)
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </ScrollFadeEffect>
    </div>
  );
}
