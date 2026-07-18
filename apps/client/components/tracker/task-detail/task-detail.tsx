"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberQueries, TagQueries, TaskQueries } from "@/lib/query/query.func";
import { useDebounce } from "@/hooks/use-debounce";
import { SubtasksTab } from "./subtasks-tab";
import { CommentsTab } from "./comments-tab";
import { AttachmentsTab } from "./attachments-tab";
import { TimeTab } from "./time-tab";
import { DependenciesTab } from "./dependencies-tab";
import { TaskSidebar } from "./task-sidebar";
import BackButton from "@/components/back";

type Tab = "subtasks" | "comments" | "attachments" | "time" | "dependencies";

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const validTabs = [
    "subtasks",
    "comments",
    "attachments",
    "time",
    "dependencies",
  ] as const;

  const urlTab = searchParams.get("tab");
  const initialTab = (
    validTabs.includes(urlTab as Tab) ? urlTab : "comments"
  ) as Tab;

  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && validTabs.includes(urlTab as Tab)) {
      setTab(urlTab as Tab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const {
    data: taskData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: TaskQueries.keys.detail(taskId),
    queryFn: () => TaskQueries.fetchByIdWithCounts(taskId),
  });

  const task = taskData?.task;
  const counts = taskData?.counts;

  const { data: allTags = [] } = useQuery({
    queryKey: TagQueries.keys.all(),
    queryFn: TagQueries.fetchAll,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: MemberQueries.keys.team(),
    queryFn: MemberQueries.fetchTeam,
  });

  const { data: clientMembers = [] } = useQuery({
    queryKey: MemberQueries.keys.clients(),
    queryFn: MemberQueries.fetchClients,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const debouncedTitle = useDebounce(title, 800);
  const debouncedDesc = useDebounce(description, 800);
  const initialised = useRef(false);
  const prevTitle = useRef("");
  const prevDesc = useRef("");

  useEffect(() => {
    if (task && !initialised.current) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      prevTitle.current = task.title;
      prevDesc.current = task.description ?? "";
      initialised.current = true;
    }
  }, [task]);

  const patch = useMutation({
    mutationFn: (payload: Parameters<typeof TaskQueries.update>[1]) =>
      TaskQueries.update(taskId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(TaskQueries.keys.detail(taskId), (old: any) => ({
        ...old,
        task: updated,
      }));
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
    },
    onError: (error: any) =>
      toast.error(error.message || "Failed to update task"),
  });

  const patchAssignees = useMutation({
    mutationFn: (assigneeIds: string[]) =>
      TaskQueries.updateAssignees(taskId, assigneeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TaskQueries.keys.detail(taskId),
      });
    },
    onError: () => toast.error("Failed to update assignees"),
  });

  const patchTags = useMutation({
    mutationFn: (tagIds: string[]) => TaskQueries.updateTags(taskId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TaskQueries.keys.detail(taskId),
      });
    },
    onError: () => toast.error("Failed to update tags"),
  });

  useEffect(() => {
    if (!initialised.current) return;
    if (debouncedTitle === prevTitle.current) return;
    if (!debouncedTitle.trim()) return;
    prevTitle.current = debouncedTitle;
    patch.mutate({ title: debouncedTitle });
  }, [debouncedTitle]);

  useEffect(() => {
    if (!initialised.current) return;
    if (debouncedDesc === prevDesc.current) return;
    prevDesc.current = debouncedDesc;
    patch.mutate({ description: debouncedDesc });
  }, [debouncedDesc]);

  const deleteMutation = useMutation({
    mutationFn: TaskQueries.delete,
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
      router.push("/tracker");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  if (isLoading) {
    return (
      <div className="min-h-0 -mx-6 grid grid-cols-8 gap-0 h-full overflow-hidden">
        <div className="col-span-5 px-6 pt-6 space-y-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="col-span-3 border-l px-5 pt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">Task not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/tracker")}
        >
          Back to Tracker
        </Button>
      </div>
    );
  }

  const teamMemberSet = new Set(teamMembers.map((m) => m.id));
  const assigneeIds = task.assignees
    .filter((a: any) => teamMemberSet.has(a.user.id))
    .map((a: any) => a.user.id);
  const clientIds = task.assignees
    .filter((a: any) => !teamMemberSet.has(a.user.id))
    .map((a: any) => a.user.id);
  const tagIds = task.tags.map((t: any) => t.tag.id);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    {
      id: "subtasks",
      label: "Sub-tasks",
      count: counts.subtasks || undefined,
    },
    {
      id: "dependencies",
      label: "Dependencies",
      count: counts?.dependencies + counts?.dependents || undefined,
    },
    {
      id: "comments",
      label: "Activity",
      count: counts.comments + counts.history || undefined,
    },
    {
      id: "time",
      label: "Time",
      count: counts.time || undefined,
    },
    // {
    //   id: "attachments",
    //   label: "Attachments",
    //   count: counts.attachments || undefined,
    // },
  ];

  return (
    <div className="-mx-12 -mt-14 grid grid-cols-8 h-[calc(100vh-4.5rem)] overflow-hidden">
      <div className="col-span-5 overflow-y-auto flex flex-col scrollbar-hidden">
        <div className="px-6 py-6 border-b">
          <BackButton href="/tracker" />
        </div>

        <div className="px-6 pt-6">
          <input
            className="w-full text-2xl font-semibol resize-none border-none outline-none leading-snug mb-3 placeholder:text-muted-foreground/30"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

          <textarea
            className="w-full text-sm text-muted-foreground bg-transparent resize-none border-none outline-none leading-relaxed placeholder:text-muted-foreground/30 mb-6"
            value={description}
            rows={8}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description…"
          />

          <div className="flex items-center mb-6 w-fit border divide-x">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-xs transition-colors cursor-pointer font-montreal-mono uppercase font-semibold ${
                  tab === t.id
                    ? "text-foreground bg-red-200 dark:bg-red-950"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`text-xs px-1.5 rounded-full tabular-nums ${
                      tab === t.id
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6">
          {tab === "subtasks" && <SubtasksTab taskId={taskId} />}
          {tab === "dependencies" && <DependenciesTab taskId={taskId} />}
          {tab === "comments" && (
            <CommentsTab
              taskId={taskId}
              projectSlug={task.project.slug}
              allMembers={[...teamMembers, ...clientMembers]}
            />
          )}
          {tab === "time" && <TimeTab taskId={taskId} />}
          {/* {tab === "attachments" && <AttachmentsTab taskId={taskId} />} */}
        </div>
      </div>
      <TaskSidebar
        task={task}
        teamMembers={teamMembers}
        clientMembers={clientMembers}
        allTags={allTags}
        assigneeIds={assigneeIds}
        clientIds={clientIds}
        tagIds={tagIds}
        onPatch={(payload) =>
          patch.mutate(payload as Parameters<typeof TaskQueries.update>[1])
        }
        onPatchAssignees={(ids) => patchAssignees.mutate(ids)}
        onPatchTags={(ids) => patchTags.mutate(ids)}
        onDelete={() => deleteMutation.mutate(task.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
