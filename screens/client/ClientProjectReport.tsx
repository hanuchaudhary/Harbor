"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { IconPrinter, IconClock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTaskTimeLogDuration } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
} from "@/lib/constants";
import { PROJECT_STATUS, TASK_STATUS, PRIORITY } from "@/types/types";
import BackButton from "@/components/back";

interface ClientProjectData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: PROJECT_STATUS;
  progressPct: number;
  startDate: string | null;
  estimatedEndAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    avgProgress: number;
    totalTimeSeconds: number;
    tasksByStatus: Record<string, number>;
  };
}

interface ClientTask {
  id: string;
  title: string;
  status: TASK_STATUS;
  priority: PRIORITY;
  progressPct: number;
  endDate: string | null;
  totalTimeSeconds: number;
}

const STATUS_ORDER: TASK_STATUS[] = [
  TASK_STATUS.COMPLETED,
  TASK_STATUS.CLIENT_REVIEW,
  TASK_STATUS.REVIEW,
  TASK_STATUS.DEVELOPMENT,
  TASK_STATUS.DESIGN,
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PLANNING,
  TASK_STATUS.DISCUSSION,
  TASK_STATUS.ON_HOLD,
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="md:border-r md:last:border-r-0 p-5 flex flex-col gap-3 min-h-30 relative overflow-hidden">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-montreal-mono">
          {label}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <span className="font-montreal-medium absolute text-[9vh] -right-2 leading-none -bottom-4 text-muted-foreground/30">
        {value}
      </span>
    </div>
  );
}

export function ClientProjectReport({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["client-project", slug],
    queryFn: async () => {
      const { data } = await axios.get<{ project: ClientProjectData }>(
        `/api/client/projects/${slug}`,
      );
      return data.project;
    },
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["client-project-tasks", slug],
    queryFn: async () => {
      const { data } = await axios.get<{ tasks: ClientTask[] }>(
        `/api/client/projects/${slug}/tasks`,
      );
      return data.tasks ?? [];
    },
    enabled: !!project,
  });

  const isLoading = isProjectLoading || isTasksLoading;
  const tasksByStatus = project?.stats.tasksByStatus ?? {};

  return (
    <div className="flex flex-col min-h-screen">
      <div className="print:hidden flex items-center justify-between mb-6">
        <BackButton href={`/${userId}/projects/${slug}`} />
        <Button className="gap-2" onClick={() => window.print()}>
          <IconPrinter className="size-4 stroke-1.5" />
          Print / Save PDF
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ) : !project ? (
        <div className="p-12 text-center text-muted-foreground">
          Project not found.
        </div>
      ) : (
        <div className="flex flex-col max-w-4xl border mx-auto w-full">
          <div className="flex items-start justify-between gap-6 print:p-8 md:p-12 p-6 border-b">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Harbor"
                  width={32}
                  height={23}
                  className="rounded-sm"
                  unoptimized
                />
                <div>
                  <p className="text-sm font-montreal-medium leading-none">
                    Harbor
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Project report
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-montreal-medium">
                  {project.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {PROJECT_STATUS_LABEL[project.status]}
                  {project.startDate &&
                    ` · Started ${format(new Date(project.startDate), "MMMM d, yyyy")}`}
                  {project.estimatedEndAt &&
                    ` · Due ${format(new Date(project.estimatedEndAt), "MMMM d, yyyy")}`}
                </p>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <p>Generated on</p>
              <p className="font-montreal-medium text-foreground">
                {format(new Date(), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-b md:divide-x-0 divide-x md:divide-y-0 divide-y">
            <StatCard
              label="Total Tasks"
              value={project.stats.totalTasks}
              sub={`${project.stats.completedTasks} completed`}
            />
            <StatCard
              label="Progress"
              value={`${project.progressPct}%`}
              sub="overall progress"
            />
            <StatCard
              label="Avg Task"
              value={`${project.stats.avgProgress}%`}
              sub="avg task completion"
            />
            <StatCard
              label="Time Tracked"
              value={Math.floor(project.stats.totalTimeSeconds / 3600) + "h"}
              sub="total logged"
            />
          </div>

          <div className="flex flex-col print:p-8 md:p-12 p-6 border-b">
            <h2 className="text-xs uppercase font-semibold font-montreal-mono mb-4 text-muted-foreground">
              Task Status Breakdown
            </h2>
            <div className="flex flex-col gap-0">
              {STATUS_ORDER.filter((s) => (tasksByStatus[s] ?? 0) > 0).map(
                (status, index) => {
                  const count = tasksByStatus[status] ?? 0;
                  const pct =
                    project.stats.totalTasks > 0
                      ? Math.round((count / project.stats.totalTasks) * 100)
                      : 0;
                  return (
                    <div
                      key={status}
                      className={cn(
                        "border p-3 flex items-center gap-4",
                        index > 0 && "border-t-0",
                      )}
                    >
                      <span className="text-sm flex-1">
                        {TASK_STATUS_LABEL[status]}
                      </span>
                      <div className="flex items-center gap-3 w-40">
                        <div className="flex-1 h-1 bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              status === TASK_STATUS.COMPLETED
                                ? "bg-emerald-500"
                                : status === TASK_STATUS.CLIENT_REVIEW
                                  ? "bg-orange-500"
                                  : "bg-blue-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                          {count} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col print:p-8 md:p-12 p-6">
              <h2 className="text-xs uppercase font-semibold font-montreal-mono mb-4 text-muted-foreground">
                All Tasks
              </h2>
              <div className="flex flex-col gap-0">
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "border p-3 flex items-center gap-4",
                      index > 0 && "border-t-0",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-montreal-medium">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {task.totalTimeSeconds > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconClock className="size-3 stroke-1.5" />
                          {formatTaskTimeLogDuration(task.totalTimeSeconds)}
                        </span>
                      )}
                      <div className="flex items-center gap-2 w-28">
                        <div className="flex-1 h-1 bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              task.progressPct === 100
                                ? "bg-emerald-500"
                                : "bg-blue-500",
                            )}
                            style={{ width: `${task.progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                          {task.progressPct}%
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground w-32 text-right">
                        {TASK_STATUS_LABEL[task.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t print:p-8 md:p-12 p-6 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Harbor"
                width={18}
                height={13}
                className="rounded-sm opacity-60"
                unoptimized
              />
              <span>Harbor · Confidential</span>
            </div>
            <span>Generated {format(new Date(), "MMM d, yyyy")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
