"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconChevronDown, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { TaskQueries } from "@/lib/query/query.func";
import { useTaskStore } from "@/lib/stores/task.store";
import { Task, TASK_STATUS } from "@/types/types";
import { KANBAN_COLUMNS } from "./constants";
import { TaskCard } from "./task-card";
import { useAuth } from "@/hooks/useAuth";

const SCROLL_THRESHOLD = 100;

interface KanbanViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCreate: (status: TASK_STATUS) => void;
  readOnly?: boolean;
  hasMore?: Record<string, boolean>;
  counts?: Record<string, number>;
  onLoadMore?: (status: TASK_STATUS) => Promise<void>;
}

export function KanbanView({
  tasks,
  onEdit,
  onDelete,
  onCreate,
  readOnly,
  hasMore = {},
  counts = {},
  onLoadMore,
}: KanbanViewProps) {
  const queryClient = useQueryClient();
  const store = useTaskStore();
  const { user } = useAuth();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingColumnsRef = useRef<Record<string, Task[]> | null>(null);
  const isDraggingRef = useRef(false);
  const tasksKeyRef = useRef("");
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const hoveredDependencyIds = useMemo(() => {
    if (!hoveredTaskId) return [];
    const task = tasks.find((t) => t.id === hoveredTaskId);
    return task?.dependencies?.map((dep) => dep.dependsOnTask.id) ?? [];
  }, [hoveredTaskId, tasks]);

  const filteredColumns = useMemo(() => {
    return KANBAN_COLUMNS.filter((col) =>
      user?.isDesigner
        ? col.id !== TASK_STATUS.DEVELOPMENT &&
          col.id !== TASK_STATUS.CLIENT_REVIEW
        : true,
    );
  }, [user?.isDesigner]);

  const buildColumns = useCallback((t: Task[]): Record<string, Task[]> => {
    const map: Record<string, Task[]> = {};
    KANBAN_COLUMNS.forEach((col) => {
      map[col.id] = t
        .filter((task) => task.status === col.id)
        .sort((a, b) => a.order - b.order);
    });
    return map;
  }, []);

  const [localColumns, setLocalColumns] = useState<Record<string, Task[]>>(() =>
    buildColumns(tasks),
  );

  useEffect(() => {
    if (isDraggingRef.current) return;
    const key = tasks
      .map((t) => `${t.id}:${t.status}:${t.order}`)
      .sort()
      .join(",");
    if (key === tasksKeyRef.current) return;
    tasksKeyRef.current = key;
    setLocalColumns(buildColumns(tasks));
  }, [tasks, buildColumns]);

  const handleScroll = useCallback(
    async (columnId: string) => {
      if (!onLoadMore || loadingStatus) return;
      if (!hasMoreRef.current[columnId]) return;
      const el = columnRefs.current[columnId];
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        setLoadingStatus(columnId);
        try {
          await onLoadMore(columnId as TASK_STATUS);
        } finally {
          setLoadingStatus(null);
        }
      }
    },
    [onLoadMore, loadingStatus],
  );

  const handleLoadMore = useCallback(
    async (columnId: string) => {
      if (!onLoadMore || loadingStatus) return;
      setLoadingStatus(columnId);
      try {
        await onLoadMore(columnId as TASK_STATUS);
      } finally {
        setLoadingStatus(null);
      }
    },
    [onLoadMore, loadingStatus],
  );

  const handleValueChange = useCallback(
    (newColumns: Record<string, Task[]>) => {
      isDraggingRef.current = true;
      setLocalColumns(newColumns);
      pendingColumnsRef.current = newColumns;

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(async () => {
        isDraggingRef.current = false;
        const finalColumns = pendingColumnsRef.current;
        pendingColumnsRef.current = null;
        if (!finalColumns) return;

        const updates: { id: string; order: number; status?: string }[] = [];
        for (const [colId, colTasks] of Object.entries(finalColumns)) {
          colTasks.forEach((task, idx) => {
            const statusChanged = task.status !== colId;
            const orderChanged = task.order !== idx;
            if (statusChanged || orderChanged) {
              updates.push({
                id: task.id,
                order: idx,
                ...(statusChanged ? { status: colId } : {}),
              });
            }
          });
        }

        if (updates.length === 0) return;

        updates.forEach(({ id, order, status }) =>
          store.updateTask(id, {
            order,
            ...(status ? { status: status as TASK_STATUS } : {}),
          }),
        );

        try {
          await TaskQueries.reorder(updates);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to reorder";
          toast.error(msg);
          const cached = queryClient.getQueryData<Task[]>(
            TaskQueries.keys.all(),
          );
          if (cached) store.setTasks(cached);
        }
      }, 400);
    },
    [store, queryClient],
  );

  if (readOnly) {
    return (
      <div className="overflow-x-auto pb-4 scrollbar-hidden">
        <div className="flex gap-4 min-w-max">
          {filteredColumns.map((col) => {
            const columnTasks = localColumns[col.id] ?? [];
            const totalCount = counts[col.id] ?? columnTasks.length;
            const canLoadMore = hasMore[col.id] && onLoadMore;
            const isLoadingThis = loadingStatus === col.id;

            return (
              <div
                key={col.id}
                className="w-64 shrink-0 flex flex-col max-h-[calc(100vh-14rem)]"
              >
                <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-background z-10 py-1">
                  <div className="flex items-center gap-2 uppercase text-xs font-semibold text-muted-foreground font-montreal-mono">
                    <span className="text-sm font-medium">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {columnTasks.length}/{totalCount}
                    </span>
                  </div>
                </div>
                <div
                  ref={(el) => {
                    columnRefs.current[col.id] = el;
                  }}
                  onScroll={() => handleScroll(col.id)}
                  className="flex-1 overflow-y-auto scrollbar-hidden pr-1"
                >
                  <div className="flex flex-col gap-2 min-h-10 scrollbar-hidden">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        readOnly
                        hoveredTaskId={hoveredTaskId}
                        hoveredDependencyIds={hoveredDependencyIds}
                        onHoverChange={setHoveredTaskId}
                      />
                    ))}
                    {canLoadMore && (
                      <button
                        onClick={() => handleLoadMore(col.id)}
                        disabled={isLoadingThis}
                        className="flex items-center justify-center gap-1 w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
                      >
                        {isLoadingThis ? (
                          <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <IconChevronDown className="h-3.5 w-3.5" />
                        )}
                        {isLoadingThis
                          ? "Loading..."
                          : `Load more (${totalCount - columnTasks.length})`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Kanban
      value={localColumns}
      onValueChange={handleValueChange}
      getItemValue={(item: Task) => item.id}
      className="w-full"
    >
      <div className="overflow-x-auto pb-4 scrollbar-hidden">
        <div className="flex gap-4 min-w-max">
          {filteredColumns.map((col) => {
            const columnTasks = localColumns[col.id] ?? [];
            const totalCount = counts[col.id] ?? columnTasks.length;
            const canLoadMore = hasMore[col.id] && onLoadMore;
            const isLoadingThis = loadingStatus === col.id;

            return (
              <KanbanColumn
                key={col.id}
                value={col.id}
                className="w-64 shrink-0 flex flex-col max-h-[calc(100vh-14rem)]"
              >
                <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-background z-10 py-1">
                  <div className="flex items-center gap-2 uppercase text-xs font-semibold text-muted-foreground font-montreal-mono">
                    <span className="text-sm font-medium">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {columnTasks.length}/{totalCount}
                    </span>
                  </div>
                  <button
                    onClick={() => onCreate(col.id)}
                    className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover/kanban-column:opacity-100"
                  >
                    <IconPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div
                  ref={(el) => {
                    columnRefs.current[col.id] = el;
                  }}
                  onScroll={() => handleScroll(col.id)}
                  className="flex-1 overflow-y-auto scrollbar-hidden pr-1"
                >
                  <KanbanColumnContent
                    value={col.id}
                    className="gap-2 min-h-10"
                  >
                    {columnTasks.map((task) => (
                      <KanbanItem key={task.id} value={task.id}>
                        <KanbanItemHandle className="cursor-grab active:cursor-grabbing">
                          <TaskCard
                            task={task}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            hoveredTaskId={hoveredTaskId}
                            hoveredDependencyIds={hoveredDependencyIds}
                            onHoverChange={setHoveredTaskId}
                          />
                        </KanbanItemHandle>
                      </KanbanItem>
                    ))}
                    {canLoadMore && (
                      <button
                        onClick={() => handleLoadMore(col.id)}
                        disabled={isLoadingThis}
                        className="flex items-center justify-center gap-1 w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
                      >
                        {!isLoadingThis && (
                          <IconChevronDown className="h-3.5 w-3.5" />
                        )}
                        {isLoadingThis ? (
                          <div className="w-full h-40 bg-secondary animate-pulse flex items-center justify-center text-sm text-muted-foreground">
                            <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                          </div>
                        ) : (
                          `Load more (${totalCount - columnTasks.length})`
                        )}
                      </button>
                    )}
                  </KanbanColumnContent>
                </div>
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      <KanbanOverlay>
        {({ value }) => {
          const task = Object.values(localColumns)
            .flat()
            .find((t) => t.id === value);
          if (!task) return null;
          return <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />;
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
