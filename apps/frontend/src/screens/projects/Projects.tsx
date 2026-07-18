"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_VARIANT,
} from "@/lib/constants";
import { ProjectQueries } from "@/lib/query/query.func";
import { PROJECT_STATUS } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IconArrowUpRight, IconPlus } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";

export function ProjectsOverview() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | PROJECT_STATUS>("ALL");
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  const filteredProjects = useMemo(() => {
    if (!data) return [];

    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.slug.toLowerCase().includes(normalizedSearch) ||
        (project.description || "").toLowerCase().includes(normalizedSearch);
      const matchesStatus = status === "ALL" || project.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading
              ? "Loading projects..."
              : `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {(role === "ADMIN" || role === "PROJECT_MANAGER") && (
          <Button asChild>
            <Link to="/projects/new">
              <IconPlus className="h-5 w-5 stroke-1" /> Create Project
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search projects by name, slug, description..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:max-w-sm"
        />

        <Select
          value={status}
          onValueChange={(value) => setStatus(value as "ALL" | PROJECT_STATUS)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Link
              to={`/projects/${project.slug}`}
              key={project.id}
              className="border py-6 px-8 space-y-3 hover:border-red-900 transition-colors relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <span className="font-medium text-xl capitalize leading-snug line-clamp-2">
                    {project.name}
                  </span>
                  <p className="text-sm text-muted-foreground">{project.slug}</p>
                </div>
                <Badge
                  variant={PROJECT_STATUS_VARIANT[project.status]}
                  className="shrink-0"
                >
                  {PROJECT_STATUS_LABEL[project.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 relative">
                <span>
                  {project._count.members} member
                  {project._count.members !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>
                  {project._count.tasks} task
                  {project._count.tasks !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="absolute bottom-3 right-3 border size-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary">
                <IconArrowUpRight className="h-6 w-6 stroke-1 text-muted-foreground hover:text-primary-foreground" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed bg-muted/30">
          <p className="text-muted-foreground text-lg">No projects found</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try changing filters or create a new project
          </p>
        </div>
      )}
    </div>
  );
}
