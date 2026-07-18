"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  IconCalendar,
  IconCheck,
  IconFolder,
  IconBuildingBridge2Filled,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_VARIANT,
} from "@/lib/constants";
import { PROJECT_STATUS } from "@/types/types";

interface ClientProject {
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
  _count: { tasks: number };
}

function ProjectCard({
  project,
  userId,
}: {
  project: ClientProject;
  userId: string;
}) {
  return (
    <Link
      href={`/${userId}/projects/${project.slug}`}
      className="group relative border px-6 pt-10 pb-6 flex flex-col gap-4  hover:bg-muted/30 transition-colors overflow-hidden"
    >
      <span
        className={cn(
          "absolute top-4 -right-10 -z-1 text-[25vh] font-semibold font-montreal-mono mask-b-from-0",
          project.progressPct === 100
            ? "text-emerald-500/20"
            : "text-destructive/20",
        )}
      >
        {project.progressPct}%
      </span>
      <div
        className="absolute h-full w-full bg-black/50 inset-0"
        style={{
          width: `${project.progressPct}%`,
          backgroundColor:
            project.progressPct === 100
              ? "rgb(16 185 129)"
              : "var(--destructive)",
          opacity: 0.05,
          zIndex: 0,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-between w-full items-center gap-2 flex-wrap">
            <p className="font-montreal-medium text-xl leading-snug truncate">
              {project.name}
            </p>
            <Badge variant={PROJECT_STATUS_VARIANT[project.status]}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground w-2xl line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <IconCircleCheckFilled className="size-5 stroke-1.5" />
          {project._count.tasks} tasks
        </span>
        {project.estimatedEndAt && (
          <span className="flex items-center gap-1 ml-auto">
            <IconCalendar className="size-5 stroke-1.5" />
            {format(new Date(project.estimatedEndAt), "MMM d, yyyy")}
          </span>
        )}
      </div>
    </Link>
  );
}

export function ClientPage({ id }: { id: string }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["client-projects"],
    queryFn: async () => {
      const { data } = await axios.get<{ projects: ClientProject[] }>(
        "/api/client/projects",
      );
      return data.projects ?? [];
    },
    enabled: !!user,
  });
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-montreal-medium">
          Welcome back,{" "}
          <span className="text-destructive">{user?.name ?? "Client"}</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s an overview of your projects and their current progress.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-4xl ml-auto mt-10">
        <h2 className="text-sm text-muted-foreground uppercase font-semibold font-montreal-mono">
          Your Projects
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border px-6 py-8 min-h-50 flex flex-col gap-4"
              >
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : data?.length === 0 ? (
          <div className="border p-10 flex flex-col items-center justify-center gap-2 text-center">
            <IconBuildingBridge2Filled className="size-6 stroke-1.5 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No projects assigned yet. Your team will add you once ready.
            </p>
          </div>
        ) : (
          <div className="gap-4">
            {data?.map((project) => (
              <ProjectCard key={project.id} project={project} userId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
