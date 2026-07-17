"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconCheck,
  IconFileReport,
  IconLayoutKanban,
  IconList,
} from "@tabler/icons-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_VARIANT,
} from "@/lib/constants";
import { PROJECT_STATUS, Task } from "@/types/types";
import { KanbanView } from "@/components/tracker/kanban-view";
import { ListView } from "@/components/tracker/list-view";
import BackButton from "@/components/back";

type ViewMode = "kanban" | "list";

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  avgProgress: number;
  totalTimeSeconds: number;
  totalMilestones: number;
  completedMilestones: number;
  tasksByStatus: Record<string, number>;
}

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
  updatedAt: string;
  members: TeamMember[];
  stats: ProjectStats;
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="border p-5 flex flex-col gap-3 min-h-30 relative overflow-hidden">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-montreal-mono">
          {label}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <span className="text-3xl font-montreal-medium absolute text-[13vh] -right-2 text-destructive mask-b-from-0">
        {value}
      </span>
    </div>
  );
}

const noop = () => {};

export function ClientProjectDetail({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const [view, setView] = useState<ViewMode>("kanban");

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
      const { data } = await axios.get<{ tasks: Task[] }>(
        `/api/client/projects/${slug}/tasks`,
      );
      return data.tasks ?? [];
    },
    enabled: !!project,
  });

  if (isProjectLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border p-5">
              <Skeleton className="h-4 w-16 mb-3" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="border p-10 flex flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Project not found.</p>
        <Link
          href={`/${userId}`}
          className="text-sm underline underline-offset-4"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <BackButton href={`/${userId}`} className="mb-2" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-montreal-medium">{project.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={PROJECT_STATUS_VARIANT[project.status]}>
                {PROJECT_STATUS_LABEL[project.status]}
              </Badge>
              {project.startDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconCalendar className="size-3.5 stroke-1.5" />
                  {format(new Date(project.startDate), "MMM d, yyyy")}
                  {project.estimatedEndAt &&
                    ` → ${format(new Date(project.estimatedEndAt), "MMM d, yyyy")}`}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
          <Link href={`/${userId}/projects/${slug}/report`}>
            <Button className="shrink-0 gap-2">
              <IconFileReport className="size-4" />
              Download Report
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Tasks"
          value={project.stats.totalTasks}
          icon={IconCheck}
          sub={`${project.stats.completedTasks} completed`}
        />
        <StatCard
          label="Progress"
          value={`${project.progressPct}%`}
          icon={IconCheck}
          sub="overall progress"
        />
        <StatCard
          label="Time Tracked"
          value={`${Math.floor(project.stats.totalTimeSeconds / 3600)}h`}
          icon={IconClock}
          sub="total logged"
        />
      </div>

      {project.members.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-muted-foreground uppercase font-semibold font-montreal-mono">
            Team
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {project.members.map((member) => (
              <div key={member.id} className="flex items-center flex-col relative">
                <Avatar className="size-25 relative">
                  <AvatarImage src={member.image ?? ""} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm absolute z-10 left-1/2 -translate-x-1/2 bottom-0 -translate-y-1/2 font-semibold bg-primary text-primary-foreground px-1">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted-foreground uppercase font-semibold font-montreal-mono">
            Tasks
            {!isTasksLoading && <span>({tasks.length})</span>}
          </h2>
          <div className="flex items-center border">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "p-2 transition-colors",
                view === "kanban"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <IconLayoutKanban className="size-4 stroke-1.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 transition-colors border-l",
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <IconList className="size-4 stroke-1.5" />
            </button>
          </div>
        </div>

        {isTasksLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0 flex flex-col gap-2">
                <Skeleton className="h-5 w-24" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="border p-8 text-center text-sm text-muted-foreground">
            No tasks found for this project.
          </div>
        ) : view === "kanban" ? (
          <KanbanView
            tasks={tasks}
            onEdit={noop}
            onDelete={noop}
            onCreate={noop}
            readOnly
          />
        ) : (
          <ListView tasks={tasks} onEdit={noop} onDelete={noop} readOnly />
        )}
      </div>
    </div>
  );
}
