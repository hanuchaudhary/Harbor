"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { authClient } from "@/lib/auth.client";
import {
  MemberQueries,
  ProjectQueries,
  TagQueries,
  TaskQueries,
} from "@/lib/query/query.func";
import { useTaskStore } from "@/lib/stores/task.store";
import { Task, TASK_STATUS } from "@/types/types";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { TrackerFilters } from "./tracker-filters";
import { TimelineView } from "./timeline-view";

export type ViewMode = "kanban" | "list" | "timeline";

const INITIAL_LIMIT_PER_STATUS = 15;

export function TrackerView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const store = useTaskStore();
  const session = authClient.useSession().data;
  const currentUserId = session?.user?.id;

  const rawView = params.get("view");
  const view: ViewMode =
    rawView === "list"
      ? "list"
      : rawView === "timeline"
        ? "timeline"
        : "kanban";

  const setView = (v: ViewMode) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", v);
    navigate(`?${next.toString()}`, { replace: true });
  };

  const [projectFilter, setProjectFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [cursors, setCursors] = useState<Record<string, string | undefined>>(
    {},
  );
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});

  const usesPagination = view === "kanban";

  const { data: paginatedData, isLoading: isPaginatedLoading } = useQuery({
    queryKey: [
      ...TaskQueries.keys.paginated(INITIAL_LIMIT_PER_STATUS),
      projectFilter,
      priorityFilter,
    ],
    queryFn: () =>
      TaskQueries.fetchPaginated(INITIAL_LIMIT_PER_STATUS, {
        projectId: projectFilter !== "ALL" ? projectFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
      }),
    enabled: usesPagination,
  });

  const { data: allTasks, isLoading: isAllLoading } = useQuery({
    queryKey: TaskQueries.keys.all(),
    queryFn: () => TaskQueries.fetchAll(),
    enabled: !usesPagination,
  });

  const isLoading = usesPagination ? isPaginatedLoading : isAllLoading;

  useEffect(() => {
    if (usesPagination && paginatedData) {
      store.setTasks(paginatedData.tasks);
      setCursors(paginatedData.cursors);
      setHasMore(paginatedData.hasMore);
      setCounts(paginatedData.counts);
    }
  }, [paginatedData, usesPagination]);

  useEffect(() => {
    if (!usesPagination && allTasks) {
      store.setTasks(allTasks);
    }
  }, [allTasks, usesPagination]);

  const loadMoreForStatus = async (status: TASK_STATUS) => {
    const cursor = cursors[status];
    if (!cursor || !hasMore[status]) return;

    try {
      const result = await TaskQueries.fetchMoreByStatus(
        status,
        cursor,
        INITIAL_LIMIT_PER_STATUS,
        {
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        },
      );
      store.appendTasks(result.tasks);
      setCursors((prev) => ({ ...prev, [status]: result.cursor }));
      setHasMore((prev) => ({ ...prev, [status]: result.hasMore }));
    } catch {
      toast.error("Failed to load more tasks");
    }
  };

  const { data: projects } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  const { data: members } = useQuery({
    queryKey: MemberQueries.keys.all(),
    queryFn: MemberQueries.fetchAll,
  });

  const { data: tags } = useQuery({
    queryKey: TagQueries.keys.all(),
    queryFn: TagQueries.fetchAll,
  });

  const deleteMutation = useMutation({
    mutationFn: TaskQueries.delete,
    onSuccess: (_data, taskId) => {
      toast.success("Task deleted");
      store.removeTask(taskId);
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
      queryClient.invalidateQueries({
        queryKey: TaskQueries.keys.paginated(INITIAL_LIMIT_PER_STATUS),
      });
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const filteredTasks = useMemo(() => {
    return store.tasks.filter((t) => {
      const matchesProject =
        projectFilter === "ALL" || t.project.id === projectFilter;
      const matchesPriority =
        priorityFilter === "ALL" || t.priority === priorityFilter;
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

      let matchesAssignee = true;
      if (assigneeFilter === "MY_TASKS") {
        matchesAssignee = currentUserId
          ? t.createdById === currentUserId
          : false;
      } else if (assigneeFilter !== "ALL") {
        matchesAssignee = t.assignees.some((a) => a.user.id === assigneeFilter);
      }

      const matchesTag =
        tagFilter === "ALL" || t.tags.some((tt) => tt.tag.id === tagFilter);

      return (
        matchesProject &&
        matchesPriority &&
        matchesStatus &&
        matchesAssignee &&
        matchesTag
      );
    });
  }, [
    store.tasks,
    projectFilter,
    priorityFilter,
    statusFilter,
    assigneeFilter,
    tagFilter,
    currentUserId,
  ]);

  const handleCreate = (status?: TASK_STATUS) => {
    const url = status ? `/tracker/new?status=${status}` : "/tracker/new";
    navigate(url);
  };

  const handleEdit = (task: Task) => {
    navigate(`/tracker/${task.id}`);
  };

  const handleDelete = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete.id);
    }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Task Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading
              ? "Loading tasks..."
              : usesPagination
                ? `${filteredTasks.length} loaded of ${totalCount} tasks`
                : `${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => handleCreate()}>
          <IconPlus className="h-4 w-4 mr-1" />
          Create Task
        </Button>
      </div>

      <TrackerFilters
        view={view}
        onViewChange={setView}
        projects={projects ?? []}
        projectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        members={members ?? []}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        currentUserId={currentUserId}
        tags={tags ?? []}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanView
          tasks={filteredTasks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          hasMore={hasMore}
          counts={counts}
          onLoadMore={loadMoreForStatus}
        />
      ) : view === "timeline" ? (
        <TimelineView tasks={filteredTasks} onEdit={handleEdit} />
      ) : (
        <ListView
          tasks={filteredTasks}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Task"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
